import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination, days_per_week = 3, property_type = '1-Bed Private Flat', total_budget = 1500 } = req.body;
    const numericBudget = Number(total_budget);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
    You are Clyde, KeelEngine's advanced London relocation AI agent.
    Generate exactly 10 realistic London neighborhood hubs for a tenant commuting to: '${destination}'.
    Budget: £${numericBudget}/month. Property Type: '${property_type}'. Days in office: ${days_per_week}.

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
          "AI_Verdict": "String"
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
    const hubs = parsed.hubs || [];

    return res.status(200).json({ hubs });

  } catch (error) {
    console.error("Compute Error:", error);
    return res.status(500).json({ error: "Clyde encountered an error analyzing the market topology. Please try again." });
  }
}