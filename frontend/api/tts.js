import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;
    
    // STRICT FILTER: Remove all emojis, asterisks, hashtags, and brackets so they aren't spoken aloud
    const cleanText = text
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replace(/[*_#\[\]()]/g, '')
      .trim();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate high-quality human voice
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Nova is a young, energetic, and professional female voice
      input: cleanText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);
  } catch (error) {
    console.error("TTS Engine Error:", error);
    return res.status(500).json({ error: "Failed to generate audio." });
  }
}