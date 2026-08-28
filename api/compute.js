import OpenAI from 'openai';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { postcode, days_per_week = 3, property_type = "1-Bed Private Flat", total_budget = 1800 } = req.body || {};

    if (!postcode) return res.status(400).json({ error: 'Office postcode is required.' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured in Vercel settings." });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
      You are KeelEngine, an enterprise London real estate AI engine.
      The user works near London postcode '${postcode}' and commutes ${days_per_week} days/week.
      Property type: '${property_type}'. Maximum total monthly outgoings (Rent + TfL travel): £${total_budget}.
      
      Identify 4 realistic London neighborhoods suitable for this commuter. 
      Return STRICTLY a JSON object with a key "hubs" containing an array of 4 objects with keys:
      "Neighborhood", "Station_Outcode", "Borough", "Rent_Range", "Commute_Duration" (number), "Line_Route", "Single_Fare_Cost" (number), "Council_Tax_Band_D_Base" (number), "Nearest_Grocery", "Nearest_Pub", "Safety_Score" (number), "Suggestion_Score" (number), "AI_Verdict".
    `;

    // Fast completion using standard json_object
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are KeelEngine AI. Return strictly valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{"hubs":[]}');

    // Fast Parallel Tavily Scraping with short 2s timeout
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && parsed.hubs && parsed.hubs.length > 0) {
      await Promise.allSettled(
        parsed.hubs.map(async (hub) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const tavRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                api_key: tavilyKey,
                query: `site:rightmove.co.uk OR site:zoopla.co.uk property to rent in ${hub.Neighborhood} ${hub.Station_Outcode}`,
                search_depth: "basic",
                max_results: 2
              })
            });
            clearTimeout(timeoutId);
            const tavData = await tavRes.json();
            hub.live_listings = (tavData.results || []).map(r => ({ title: r.title, url: r.url }));
          } catch (e) {
            hub.live_listings = [];
          }
        })
      );
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Vercel Runtime Exception:", err);
    return res.status(500).json({ error: `Runtime Exception: ${err.message}` });
  }
}