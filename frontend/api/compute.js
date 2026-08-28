import OpenAI from 'openai';

export default async function handler(req, res) {
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
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel settings." });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
      User works near London postcode '${postcode}' and commutes ${days_per_week} days/week.
      Property allocation: '${property_type}'. Maximum total monthly outgoings (Rent + TfL travel): £${total_budget}.

      Suggest 4 realistic London neighborhoods suitable for this commuter. 
      For each neighborhood, calculate:
      1. Exact latitude and longitude for mapping pins.
      2. Realistic rent range for '${property_type}'.
      3. A step-by-step Journey_Breakdown (e.g. '5 min walk to Angel Station ➔ Northern Line (12 mins) to Bank ➔ 4 min walk to office').
      4. Single_Fare_Cost in GBP for TfL Peak travel.
      5. TfL_Fare_Explanation explicitly detailing how the monthly transit cost is calculated (e.g., 'Zone 2 to Zone 1 Peak single fare is £3.40. (£3.40 x 2 journeys x ${days_per_week} days x 4.33 weeks = £${Math.round(3.40 * 2 * days_per_week * 4.33)}/mo)').
      6. Safety_Score out of 100 based on London Met Police data.
      7. AI_Verdict explaining the trade-offs.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are KeelEngine AI. Return strictly valid JSON adhering to the schema.' },
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
                    Neighborhood: { type: "string" },
                    Station_Outcode: { type: "string" },
                    Borough: { type: "string" },
                    Latitude: { type: "number" },
                    Longitude: { type: "number" },
                    Rent_Range: { type: "string" },
                    Commute_Duration: { type: "number" },
                    Journey_Breakdown: { type: "string" },
                    Line_Route: { type: "string" },
                    Single_Fare_Cost: { type: "number" },
                    TfL_Fare_Explanation: { type: "string" },
                    Safety_Score: { type: "number" },
                    Suggestion_Score: { type: "number" },
                    AI_Verdict: { type: "string" }
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

    // Fetch Live Web Listings via Tavily for the target property type
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && parsed.hubs && parsed.hubs.length > 0) {
      await Promise.allSettled(
        parsed.hubs.map(async (hub) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const tavRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                api_key: tavilyKey,
                query: `site:rightmove.co.uk OR site:zoopla.co.uk ${property_type} to rent in ${hub.Neighborhood} ${hub.Station_Outcode}`,
                search_depth: "basic",
                max_results: 3
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
    console.error("OpenAI Execution Error:", err);
    return res.status(500).json({ error: `AI Search Error: ${err.message}` });
  }
}