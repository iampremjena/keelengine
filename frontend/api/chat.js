import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing. Please contact developer." });
    }

    const openai = new OpenAI({ apiKey });

    const systemMessage = {
      role: "system",
      content: `You are Bonnie, the friendly and knowledgeable assistant for KeelEngine (a London Commute & Housing Finder platform).
      
      KeelEngine calculates real living outgoings by combining household income, max rent allowance %, TfL peak transit fares, council tax, and London Met Police safety scores to recommend ideal neighborhoods.

      Your role:
      1. Help users with FAQs regarding how KeelEngine works, TfL fare structures, London commute zones, budget allocation %, and moving tips.
      2. Keep responses brief, polite, and helpful (maximum 2-3 short paragraphs).
      3. If a user reports a technical bug, complex issue, system error, or account issue that you cannot fix, kindly ask them to write directly to our lead developer at iampremjena@gmail.com.`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...(messages || [])],
      max_tokens: 300
    });

    return res.status(200).json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error("Bonnie Chat Error:", err);
    return res.status(500).json({ error: "Bonnie is currently offline. Please email iampremjena@gmail.com for support." });
  }
}