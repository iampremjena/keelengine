import OpenAI from 'openai';

// 2026 London Market Baseline Tiers
const PROPERTY_TIERS = [
  { type: 'Shared Flatshare / Room', minBudget: 750 },
  { type: 'Studio Flat', minBudget: 1200 },
  { type: '1-Bed Private Flat', minBudget: 1450 },
  { type: '2-Bed Flat', minBudget: 1800 }
];

// Zone fare mapping for accurate TfL Peak Math
const TFL_ZONE_FARES = {
  'Zone 1': 3.10,
  'Zone 2': 3.60,
  'Zone 3': 3.90,
  'Zone 4': 4.40,
  'Zone 5': 5.20,
  'Zone 6': 5.80
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination, days_per_week = 3, property_type = '1-Bed Private Flat', total_budget = 1500 } = req.body;
    const numericBudget = Number(total_budget);

    // 1. Budget Floor Guard (< £750/mo)
    const absoluteMin = PROPERTY_TIERS[0].minBudget;
    if (numericBudget < absoluteMin) {
      return res.status(200).json({
        error: `There are no suitable accommodation options in London for a budget of £${numericBudget.toLocaleString()}/mo. The current absolute minimum for shared accommodation starts around £${absoluteMin}/mo.`
      });
    }

    // 2. Dynamic Escalation Check
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

    // 3. Clyde's Enhanced Spatial Reasoning Engine
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    You are Clyde, KeelEngine's advanced London spatial AI research agent.
    Generate exactly 10 realistic London neighborhood hubs for a tenant commuting to: '${destination}'.
    
    STRICT FINANCIAL & SPATIAL ENGINE RULES:
    - User's Maximum Combined Budget (Rent + Peak TfL Commute): £${numericBudget}/month.
    - Property Type Requested: '${property_type}'.
    - Office Days: ${days_per_week} days/week.
    
    DYNAMIC ACCURACY INSTRUCTIONS:
    - Compute single fare using realistic TfL Zone pricing (Zone 1: £3.10, Zone 2: £3.60, Zone 3: £3.90, Zone 4: £4.40, Zone 5: £5.20, Zone 6: £5.80).
    - Ensure rent range lower bound is ALWAYS <= £${numericBudget}.
    - Safety_Score (1-100) must reflect local Metropolitan Police crime statistics accurately (higher score = safer).

    Return ONLY a JSON object with a "hubs" key containing an array of 10 objects with this exact schema:
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
          "Journey_Breakdown": "String (e.g. Northern Line direct 22 mins)",
          "Rent_Range": "String (e.g. £1,400 - £1,600/mo)",
          "Safety_Score": Number (1-100),
          "Suggestion_Score": Number (1-100),
          "AI_Verdict": "String (2 short sentences explaining why this area fits their budget)"
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

    return res.status(200).json({ hubs });

  } catch (error) {
    console.error("Compute Error:", error);
    return res.status(500).json({ error: "Clyde encountered an error searching for neighborhoods. Please try again." });
  }
}