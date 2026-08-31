import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = {
      role: 'system',
      content: `
      You are Bonnie, KeelEngine's cheerful, witty, and highly helpful AI support receptionist.
      Your job is to answer user questions about how KeelEngine works, London renting, TfL fare math, and budget allocations.

      TONE & STYLE:
      - Cheerful, approachable, concise, and slightly witty.
      - Never overly formal. Use bullet points when explaining multi-step guides.
      - Maintain strict accuracy on London commuting rules (TfL peak hours are 06:30-09:30 and 16:00-19:00 Mon-Fri).

      KEY KNOWLEDGE:
      - KeelEngine calculates "True Budget" = Rent + Peak TfL Commute Costs.
      - Clyde is our research agent who finds 10 tailored neighborhoods on the fly.
      - You (Bonnie) are the support receptionist guiding users through the app.
      `
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemPrompt, ...messages]
    });

    const reply = response.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Bonnie is taking a quick tea break. Please try again in a second!" });
  }
}