import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { messages } = req.body || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemMessage = {
      role: "system",
      content: `You are Bonnie, the delightfully witty, warm, and professional receptionist for KeelEngine London.
      
      Your partner, Clyde, is our smart search engine that finds properties and calculates TfL transit fares.
      
      TONE & PERSONALITY:
      - Cheerful, happy, welcoming, and playfully witty.
      - If users ask about property suggestions, remind them that Clyde is the researcher doing the heavy lifting, but you are here to guide them.
      
      CRITICAL FORMATTING RULES:
      - Use HTML formatting: <br>, <strong>, <ul>, and <li>.
      - Use bulleted lists (<ul><li>...</li></ul>) whenever explaining steps or multiple points.
      - Do NOT use markdown (* or #). Keep answers concise and easy to read.
      
      If users report technical bugs, politely ask them to email lead developer Prem Jena directly at iampremjena@gmail.com.`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...(messages || [])],
      max_tokens: 350
    });

    return res.status(200).json({ reply: completion.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: "Bonnie is currently taking a tea break. Please email iampremjena@gmail.com." });
  }
}