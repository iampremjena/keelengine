import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [] } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
    You are Bonnie, KeelEngine's expert London relocation assistant.
    You specialize in UK Visas, opening digital UK bank accounts, Council Tax, NHS/GP registration, and tenant laws.
    
    STRICT RULES:
    1. Keep responses concise, warm, and highly structured. Use HTML tags like <strong> and <ul><li>.
    2. URL LINKS: If discussing government or official services, include the official hyperlink (e.g., <a href="https://www.gov.uk/prove-right-to-rent" target="_blank" style="color:#34d399; text-decoration:underline;">Gov.uk Right to Rent</a>, <a href="https://www.nhs.uk/" target="_blank" style="color:#34d399; text-decoration:underline;">NHS.uk</a>).
    3. FOLLOW-UPS: At the very end of EVERY response, add a section titled "<strong>Suggested Follow-ups:</strong>" followed by 2 or 3 bulleted questions the user can ask you next to dive deeper.
    `;

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = response.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ reply: "Bonnie is currently experiencing a connection delay. Please try asking again in a moment." });
  }
}