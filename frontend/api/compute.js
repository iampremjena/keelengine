import OpenAI from 'openai';

// 2026 London Market Baseline Tiers
const PROPERTY_TIERS = [
  { type: 'Shared Flatshare / Room', minBudget: 750 },
  { type: 'Studio Flat', minBudget: 1200 },
  { type: '1-Bed Private Flat', minBudget: 1450 },
  { type: '2-Bed Flat', minBudget: 1800 }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination, days_per_week = 3, property_type = '1-Bed Private Flat', total_budget = 1500 } = req.body;
    const numericBudget = Number(total_budget);

    const absoluteMin = PROPERTY_TIERS[0].minBudget;
    if (numericBudget < absoluteMin) {
      return res.status(200).json({
        error: `There are no suitable accommodation options in London for a budget of £${numericBudget.toLocaleString()}/mo. The current absolute minimum for shared accommodation starts around £${absoluteMin}/mo.`
      });
    }

    const currentTier = PROPERTY_TIERS.find(t => t.type === property_type) || PROPERTY_TIERS[2];
    
    if (numericBudget < currentTier.minBudget) {
      const suitableTier = [...PROPERTY_TIERS].reverse().find(t => numericBudget >= t.minBudget);
      if (suitableTier && suitableTier.type !== property_type) {
        return res.status(200).json({
          budget_insufficient: true,
          requested_type: property_type,
          suggested_type: suitableTier.type,
          user_budget: numericBudget,
          message: `Your budget of £${numericBudget.toLocaleString()}/mo is below the current London baseline for a ${property_type} (which starts around £${currentTier.minBudget}/mo). Would you like to view ${suitableTier.type} options instead?`
        });
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    You are Clyde, KeelEngine's advanced Enterprise London relocation AI agent.
    Generate a market briefing and exactly 10 realistic London neighborhood hubs for a tenant commuting to: '${destination}'.
    
    STRICT FINANCIAL & SPATIAL ENGINE RULES (Year: 2026):
    - Maximum Combined Budget (Rent + Peak TfL Commute): £${numericBudget}/month.
    - Property Type Requested: '${property_type}'.
    - Office Days: ${days_per_week} days/week.
    
    DYNAMIC ACCURACY INSTRUCTIONS:
    - Single_Fare_Cost: MUST be a pure number (e.g. 3.60). Use real 2026 Peak Fares to Zone 1: Z2=3.60, Z3=3.90, Z4=4.80, Z5=5.30, Z6=5.90.
    - Rent Bounds: Rent_Lower_Bound MUST be <= £${numericBudget}.
    - Council Tax: Provide a realistic monthly average for the specific Borough.
    - Famous_Hotspots: Name 2-3 specific Instagram-viral food markets, famous restaurants, or iconic spots in this neighborhood.

    Return ONLY a JSON object with this exact schema:
    {
      "market_briefing": "String (A 3-sentence executive AI summary analyzing the market, lifestyle vibe, and commute reality. Be brutally honest.)",
      "hubs": [
        {
          "Neighborhood": "String",
          "Station_Outcode": "String",
          "Borough": "String",
          "Latitude": Number,
          "Longitude": Number,
          "Commute_Duration": Number,
          "Single_Fare_Cost": Number,
          "Journey_Breakdown": "String (e.g. Northern Line direct 22 mins)",
          "Rent_Range": "String (e.g. £1,400 - £1,600/mo)",
          "Rent_Lower_Bound": Number (e.g. 1400),
          "Council_Tax_Estimate": Number,
          "Safety_Score": Number (1-100),
          "Suggestion_Score": Number (1-100),
          "Groceries_Vibe": "String",
          "Social_Vibe": "String",
          "Night_Transit": "String",
          "Famous_Hotspots": "String (e.g. 'Borough Market, Padella Pasta, and The Shard view')",
          "AI_Verdict": "String (2 short sentences on why this fits their budget/commute)"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const hubs = parsed.hubs || parsed.neighborhoods || parsed.results || (Array.isArray(parsed) ? parsed : []);
    const marketBriefing = parsed.market_briefing || "Market data processed successfully for your destination.";

    return res.status(200).json({ hubs, market_briefing: marketBriefing });

  } catch (error) {
    console.error("Compute Error:", error);
    return res.status(500).json({ error: "Clyde encountered an error analyzing the market topology. Please try again." });
  }
}