export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, level } = req.body;

  if (!topic || !level) {
    return res.status(400).json({ error: 'Missing topic or level' });
  }

  const prompts = {
    simple: `Explain "${topic}" as if talking to a curious 8-year-old. Use a simple real-world analogy. Warm, short, clear. 2-3 paragraphs. Zero jargon. Plain text only, no markdown, no asterisks, no bullet points.`,
    intermediate: `Explain "${topic}" to a curious 16-year-old. Clear language, relatable examples, key terms briefly defined. 3-4 paragraphs. Genuine understanding. Plain text only, no markdown, no asterisks, no bullet points.`,
    expert: `Explain "${topic}" for someone with a strong educational background. Technically precise — mechanisms, key principles, nuances, open questions. 4-5 paragraphs. Domain-appropriate terminology. Plain text only, no markdown, no asterisks, no bullet points.`
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are an expert explainer. Always respond in plain text only — no markdown, no asterisks, no bullet points, no headers. Just clean, flowing paragraphs.'
          },
          { role: 'user', content: prompts[level] }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content || 'Could not generate explanation.';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: 'Server error. Try again.' });
  }
}
