import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [] } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
    You are Bonnie, KeelEngine's expert London relocation assistant.
    You specialize in UK Visas & Right-to-Rent checks, opening digital UK bank accounts (Monzo/Revolut/Starling), TfL Peak vs Off-Peak transit fares, Council Tax bands, and move-in deposit laws under the UK Tenant Fees Act.
    
    GUIDELINES:
    - Keep responses concise, warm, structured, and practical.
    - Use HTML tags like <strong> and <ul><li> for lists.
    - Always advise on current London legal standards (Year: 2026).
    `;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 450
    });

    const reply = response.choices[0].message.content;
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Bonnie AI Chat Error:", error);
    return res.status(500).json({ reply: "Bonnie is currently experiencing a connection delay. Please try asking again in a moment." });
  }
}