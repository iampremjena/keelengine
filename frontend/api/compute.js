import OpenAI from 'openai';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { postcode, days_per_week = 3, property_type = "1-Bed Private Flat", total_budget = 1800 } = req.body || {};

  if (!postcode) return res.status(400).json({ error: 'Office postcode is required.' });

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: OPENAI_API_KEY environment variable is missing in Vercel!");
    return res.status(500).json({ error: "API Key missing. Please check Vercel Environment Variables." });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `
      User works near London postcode '${postcode}' and commutes ${days_per_week} days/week.
      Property requirement: '${property_type}'. Maximum total monthly outgoings (Rent + TfL travel): £${total_budget}.
      
      Suggest 4 realistic London neighborhoods/stations suitable for this commuter. 
      Return realistic rent ranges, TfL peak fare estimates, safety scores out of 100, council tax band D estimates, and a 2-sentence AI trade-off verdict.
    `;

    // 1. Fetch AI Suggestions using Structured Outputs Schema
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
                    Rent_Range: { type: "string" },
                    Commute_Duration: { type: "number" },
                    Line_Route: { type: "string" },
                    Single_Fare_Cost: { type: "number" },
                    Council_Tax_Band_D_Base: { type: "number" },
                    Nearest_Grocery: { type: "string" },
                    Nearest_Pub: { type: "string" },
                    Safety_Score: { type: "number" },
                    Suggestion_Score: { type: "number" },
                    AI_Verdict: { type: "string" }
                  },
                  required: ["Neighborhood", "Station_Outcode", "Borough", "Rent_Range", "Commute_Duration", "Line_Route", "Single_Fare_Cost", "Safety_Score", "Suggestion_Score", "AI_Verdict"],
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

    // 2. Parallelized Live Scraping via Tavily (Fast Execution)
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && parsed.hubs && parsed.hubs.length > 0) {
      await Promise.all(
        parsed.hubs.map(async (hub) => {
          try {
            const tavRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: tavilyKey,
                query: `site:rightmove.co.uk OR site:zoopla.co.uk property to rent in ${hub.Neighborhood} ${hub.Station_Outcode}`,
                search_depth: "basic",
                max_results: 2
              })
            });
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