import OpenAI from 'openai';

const PROPERTY_TIERS = [
  { type: 'Shared Flatshare / Room', minBudget: 750 },
  { type: 'Studio Flat', minBudget: 1200 },
  { type: '1-Bed Private Flat', minBudget: 1450 },
  { type: '2-Bed Flat', minBudget: 1800 }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { destination, days_per_week = 3, property_type = '1-Bed Private Flat', total_budget = 1500 } = req.body;
    const numericBudget = Number(total_budget);

    const absoluteMin = PROPERTY_TIERS[0].minBudget;
    if (numericBudget < absoluteMin) {
      return res.status(200).json({ error: `There are no suitable accommodation options in London for a budget of £${numericBudget.toLocaleString()}/mo. The current absolute minimum for shared accommodation starts around £${absoluteMin}/mo.` });
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
    Generate exactly 5 realistic, distinct London neighborhood hubs for a tenant commuting to: '${destination}'.
    
    STRICT FINANCIAL & SPATIAL ENGINE RULES:
    - Maximum Combined Budget (Rent + Peak TfL Commute): £${numericBudget}/month.
    - Property Type Requested: '${property_type}'.
    - Office Days: ${days_per_week} days/week.
    
    DETERMINISTIC EVALUATION & ACCURACY INSTRUCTIONS:
    - Single_Fare_Cost: Provide the exact numerical cost of a peak TfL single journey (e.g. 3.60).
    - Journey_Breakdown: Explicitly state the exact train/tube lines and time in minutes (e.g. "Jubilee Line to Waterloo (18 mins)").
    - Gyms: List key local gyms and fitness centers available in the area (e.g. "PureGym, Gymbox, local council leisure center").
    - Supermarkets: List major grocery options in the area (e.g. "Sainsbury's Local, Waitrose, M&S Food").
    - Suggestion_Score: Compute a deterministic score out of 100 weighting short commute duration, low fare cost, safety, and budget margin.
    - SORTING: Sort the final 'hubs' array strictly by 'Suggestion_Score' in descending order (highest score first).

    Return ONLY a JSON object with this exact schema:
    {
      "hubs": [
        {
          "Neighborhood": "String",
          "Station_Outcode": "String",
          "Borough": "String",
          "Latitude": Number,
          "Longitude": Number,
          "Commute_Duration": Number,
          "Single_Fare_Cost": Number,
          "Journey_Breakdown": "String",
          "Rent_Range": "String",
          "Rent_Lower_Bound": Number,
          "Rent_Upper_Bound": Number,
          "Safety_Score": Number,
          "Suggestion_Score": Number,
          "Vibe": "String",
          "Connectivity": "String",
          "Famous_Spots": "String",
          "Supermarkets": "String",
          "Gyms": "String",
          "AI_Verdict": "String"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1 // Low temperature ensures consistent, repeatable recommendations
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    let hubs = parsed.hubs || [];

    // Force strict client-side sorting by Suggestion_Score descending
    hubs.sort((a, b) => Number(b.Suggestion_Score || 0) - Number(a.Suggestion_Score || 0));

    return res.status(200).json({ hubs });

  } catch (error) {
    console.error("Compute Error:", error);
    return res.status(500).json({ error: "Clyde encountered an error analyzing the market topology. Please try again." });
  }
}