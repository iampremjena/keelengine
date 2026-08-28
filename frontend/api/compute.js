// api/compute.js (Vercel Serverless Function)
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { postcode, days_per_week, property_type, total_budget } = req.body;

  if (!postcode) return res.status(400).json({ error: 'Postcode is required' });

  try {
    // 1. AI Structural Recommendation Query
    const prompt = `
      The user works near London postcode '${postcode}' and commutes ${days_per_week} days/week.
      They want a '${property_type}' with a strict maximum total budget (rent + TfL tube/train fare) of £${total_budget}/month.
      
      Identify 4 distinct, real London neighborhoods/stations that fit this criteria.
      For each neighborhood, return realistic rent ranges, TfL peak fare estimates, safety scores out of 100, council tax band D estimates, and a 2-sentence AI Verdict.
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are KeelEngine, an enterprise London real estate intelligence system. Return ONLY raw JSON without markdown formatting.' },
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

    const parsedData = JSON.parse(completion.choices[0].message.content);

    // 2. Fetch Live Web Listings from Rightmove / Zoopla using Tavily
    const tavilyKey = process.env.TAVILY_API_KEY;
    
    if (tavilyKey && parsedData.hubs) {
      for (let hub of parsedData.hubs) {
        try {
          const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: `site:rightmove.co.uk OR site:zoopla.co.uk property to rent in ${hub.Neighborhood} ${hub.Station_Outcode} ${property_type}`,
              search_depth: "basic",
              max_results: 2
            })
          });
          const tavilyData = await tavilyRes.json();
          hub.live_listings = (tavilyData.results || []).map(r => ({ title: r.title, url: r.url }));
        } catch (e) {
          hub.live_listings = [];
        }
      }
    }

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("Vercel Function Error:", error);
    return res.status(500).json({ error: error.message || "Failed to orchestrate AI Search." });
  }
}