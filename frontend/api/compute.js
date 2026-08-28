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

    if (!targetOfficeLocation) {
      return res.status(400).json({ error: 'Office target location or postcode is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel settings." });
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `
      TARGET OFFICE DESTINATION: '${targetOfficeLocation}'
      COMMUTE FREQUENCY: ${days_per_week} days/week.
      PROPERTY TYPE: '${property_type}'.
      MAX TOTAL MONTHLY BUDGET (Rent + TfL): £${total_budget}.

      Suggest EXACTLY 10 realistic, diverse London commuter neighborhoods/stations suitable for someone working at '${targetOfficeLocation}'.
      For each neighborhood, return:
      1. Exact Latitude and Longitude coordinates.
      2. Rent_Range for '${property_type}'.
      3. Commute_Duration: Estimated transit duration in minutes specifically to '${targetOfficeLocation}'.
      4. Journey_Breakdown: Step-by-step route travel directly to '${targetOfficeLocation}'.
      5. Single_Fare_Cost: TfL Peak single fare in GBP to '${targetOfficeLocation}' zone.
      6. TfL_Fare_Explanation: Explicit breakdown showing math (£fare x 2 x ${days_per_week} days x 4.33 = £total/mo).
      7. Safety_Score out of 100 based on crime statistics.
      8. AI_Verdict: 2 sentences explaining why this neighborhood matches '${targetOfficeLocation}'.
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

    // Fetch Live Web Listings via Tavily in Parallel
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
    console.error("Compute Error:", err);
    return res.status(500).json({ error: `Search Error: ${err.message}` });
  }
}