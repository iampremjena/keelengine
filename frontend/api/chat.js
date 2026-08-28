import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { messages } = req.body || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemMessage = {
      role: "system",
      content: `You are Bonnie, the cheerful, welcoming, and highly professional receptionist for KeelEngine (London Commute & Housing Finder).
      
      CRITICAL FORMATTING RULES:
      1. Structure your answers beautifully using HTML tags: <br>, <strong>, <ul>, and <li>.
      2. Use bulleted lists (<ul><li>...</li></ul>) whenever explaining steps, rules, or multiple points.
      3. Keep paragraphs short and well-spaced. Do NOT use markdown (* or #).
      
      Your role: Help users understand KeelEngine, TfL fare structures, and budget allocation. If they report a system error or need deep technical help, ask them to email our lead developer at iampremjena@gmail.com.`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...(messages || [])],
      max_tokens: 400
    });

    return res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: "Bonnie is currently offline. Please email iampremjena@gmail.com." });
  }
}