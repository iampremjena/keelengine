import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Generate speech using the 'nova' voice
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
    });

    // Convert the stream arrayBuffer into a Node Buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Send the raw audio stream back to the browser
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "Failed to generate speech." });
  }
}