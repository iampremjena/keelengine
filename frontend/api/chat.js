import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [] } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
    You are Bonnie, KeelEngine's expert London relocation assistant.
    You specialize in UK Visas, UK bank accounts, Council Tax, NHS/GP registration, and tenant laws.
    
    STRICT BEHAVIOR RULES:
    1. If the user asks you to search for properties, find neighborhoods, or run a commute calculation, say: "Clyde, the main search engine on the dashboard, will help you with that! Just enter your details in his form."
    2. If the user asks something completely outside your knowledge base or you do not understand, say: "I'm not quite sure about that, but please email Prem Jena, the founder, at iampremjena@gmail.com and he will sort you out!"
    3. Include official URL links (e.g., <a href="..." target="_blank" style="color:#34d399; text-decoration:underline;">Link Name</a>) when relevant.
    4. At the very end of EVERY response, add a section titled "<strong>Suggested Follow-ups:</strong>" with 2 or 3 bulleted questions.
    `;

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 500
    });

    return res.status(200).json({ reply: response.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ reply: "Bonnie is currently experiencing a connection delay. Please try again." });
  }
}