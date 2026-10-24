import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;
    
    // Clean text to eliminate unnatural silent pauses
    const cleanText = text
      // 1. Remove all emojis
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      // 2. Convert ellipses and hyphens to normal stops to avoid long pauses
      .replace(/\.{2,}/g, '.')
      .replace(/[-–—]/g, ' ')
      // 3. Remove markdown symbols
      .replace(/[*_#\[\]()]/g, '')
      // 4. Collapse double spaces/newlines
      .replace(/\s+/g, ' ')
      .trim();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate cheerful female audio (Nova voice)
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Studio-quality energetic female voice
      input: cleanText,
      speed: 1.05 // Slightly energetic pace for a cheerful receptionist tone
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);
  } catch (error) {
    console.error("TTS Engine Error:", error);
    return res.status(500).json({ error: "Failed to generate audio." });
  }
}