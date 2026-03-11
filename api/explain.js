export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, level } = req.body;
  if (!topic || !level) return res.status(400).json({ error: 'Missing topic or level' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  let systemPrompt = '';
  let userPrompt = '';

  if (level === 'simple') {
    systemPrompt = 'You explain concepts simply and clearly, like talking to a curious 12-year-old. Use relatable analogies. 3-4 short paragraphs max. No bullet points, just flowing prose.';
    userPrompt = `Explain "${topic}" in simple terms.`;
  } else if (level === 'intermediate') {
    systemPrompt = 'You explain concepts at an intermediate level — assume the person has general knowledge but is not an expert. Use some technical terms but explain them briefly. 3-4 paragraphs. Flowing prose only.';
    userPrompt = `Explain "${topic}" at an intermediate level.`;
  } else if (level === 'expert') {
    systemPrompt = 'You explain concepts at an expert level — use technical terminology, cover nuance, edge cases, and deeper implications. 4-5 paragraphs. Flowing prose only.';
    userPrompt = `Explain "${topic}" at an expert level.`;
  } else if (level === 'related') {
    systemPrompt = 'You suggest related topics to explore. Return ONLY a plain list of 5 related topics, one per line, no numbering, no bullets, no extra text. Keep each topic short (2-6 words).';
    userPrompt = `Give 5 related topics to explore after learning about "${topic}".`;
  } else if (level === 'quiz') {
    systemPrompt = `You generate multiple choice quiz questions. Return ONLY a valid JSON object in this exact format, nothing else:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of why this is correct."
    }
  ]
}
Generate exactly 3 questions. "correct" is the 0-based index of the correct option.`;
    userPrompt = `Create a 3-question multiple choice quiz about "${topic}".`;
  } else {
    return res.status(400).json({ error: 'Invalid level' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: level === 'quiz' ? 1200 : 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Groq API error' });

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach AI service. Please try again.' });
  }
}
