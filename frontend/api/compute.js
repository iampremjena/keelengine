import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { destination, postcode, days_per_week = 3, property_type = "1-Bed Private Flat", total_budget = 1800 } = req.body || {};
    const targetOfficeLocation = (destination || postcode || '').trim();

    if (!targetOfficeLocation) return res.status(400).json({ error: 'Office target location is required.' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY is missing." });

    const openai = new OpenAI({ apiKey });

    const prompt = `
      TARGET OFFICE DESTINATION: '${targetOfficeLocation}'
      COMMUTE FREQUENCY: ${days_per_week} days/week.
      PROPERTY TYPE: '${property_type}'.
      MAX TOTAL MONTHLY BUDGET (Rent + TfL): £${total_budget}.

      Suggest EXACTLY 10 realistic, diverse London commuter neighborhoods suitable for working at '${targetOfficeLocation}'.
      For each neighborhood, return:
      1. Latitude and Longitude.
      2. Rent_Range for '${property_type}'.
      3. Commute_Duration to '${targetOfficeLocation}'.
      4. Journey_Breakdown directly to '${targetOfficeLocation}'.
      5. Single_Fare_Cost (TfL Peak single fare).
      6. TfL_Fare_Explanation.
      7. Safety_Score (out of 100).
      8. AI_Verdict (2 sentences).
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are KeelEngine. Return strictly valid JSON with 10 hubs.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "housing_response",
          schema: {
            type: "object",
            properties: {
              hubs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    Neighborhood: { type: "string" }, Station_Outcode: { type: "string" }, Borough: { type: "string" },
                    Latitude: { type: "number" }, Longitude: { type: "number" }, Rent_Range: { type: "string" },
                    Commute_Duration: { type: "number" }, Journey_Breakdown: { type: "string" }, Line_Route: { type: "string" },
                    Single_Fare_Cost: { type: "number" }, TfL_Fare_Explanation: { type: "string" },
                    Safety_Score: { type: "number" }, Suggestion_Score: { type: "number" }, AI_Verdict: { type: "string" }
                  },
                  required: ["Neighborhood", "Station_Outcode", "Borough", "Latitude", "Longitude", "Rent_Range", "Commute_Duration", "Journey_Breakdown", "Line_Route", "Single_Fare_Cost", "TfL_Fare_Explanation", "Safety_Score", "Suggestion_Score", "AI_Verdict"],
                  additionalProperties: false
                }
              }
            },
            required: ["hubs"],
            additionalProperties: false
          }
        }
      }
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{"hubs":[]}');

    // Stricter Tavily Search for actual property listing URLs
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && parsed.hubs && parsed.hubs.length > 0) {
      await Promise.allSettled(
        parsed.hubs.map(async (hub) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const tavRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                api_key: tavilyKey,
                query: `${property_type} to rent in ${hub.Neighborhood} London site:rightmove.co.uk/properties OR site:zoopla.co.uk/to-rent/details`,
                search_depth: "basic",
                max_results: 3
              })
            });
            clearTimeout(timeoutId);
            const tavData = await tavRes.json();
            
            // Filter to only include actual listing links, not generic search pages
            hub.live_listings = (tavData.results || [])
              .filter(r => r.url.includes('/properties/') || r.url.includes('/details/') || r.url.includes('openrent'))
              .map(r => ({ title: r.title, url: r.url }));
          } catch (e) {
            hub.live_listings = [];
          }
        })
      );
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: `Search Error: ${err.message}` });
  }
}