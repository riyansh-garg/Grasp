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
    systemPrompt = 'You explain concepts at an intermediate level. 3-4 paragraphs. Flowing prose only.';
    userPrompt = `Explain "${topic}" at an intermediate level.`;
  } else if (level === 'expert') {
    systemPrompt = 'You explain concepts at an expert level with technical depth. 4-5 paragraphs. Flowing prose only.';
    userPrompt = `Explain "${topic}" at an expert level.`;
  } else if (level === 'tldr') {
    systemPrompt = 'Give a single sentence TL;DR summary of the topic. Maximum 25 words. No punctuation at start. Just the sentence.';
    userPrompt = `TL;DR for "${topic}"`;
  } else if (level === 'related') {
    systemPrompt = 'Return ONLY a plain list of 5 related topics, one per line, no numbering, no bullets, no extra text. Keep each topic short (2-6 words).';
    userPrompt = `Give 5 related topics to explore after learning about "${topic}".`;
  } else if (level === 'quiz') {
    systemPrompt = `You generate multiple choice quiz questions. Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this is correct."
    }
  ]
}
Generate exactly 3 questions.`;
    userPrompt = `Create a 3-question MCQ quiz about "${topic}".`;
  } else if (level === 'flashcards') {
    systemPrompt = `Generate flashcards for studying. Return ONLY valid JSON:
{
  "flashcards": [
    { "front": "Question or term", "back": "Answer or definition (2-3 sentences max)" }
  ]
}
Generate exactly 5 flashcards covering key concepts.`;
    userPrompt = `Create 5 flashcards for studying "${topic}".`;
  } else if (level === 'doubts') {
    systemPrompt = `Generate a list of common confusing subtopics. Return ONLY valid JSON:
{
  "doubts": [
    { "label": "Short label (4-6 words)", "subtopic": "Full subtopic description" }
  ]
}
Generate exactly 5 common points of confusion or doubt someone might have after reading about this topic.`;
    userPrompt = `What are 5 common doubts or confusing points someone might have after learning about "${topic}"?`;
  } else if (level === 'doubt_explain') {
    systemPrompt = 'Explain this specific confusing subtopic in the most interactive, simple, friendly way possible. Use a real-world analogy. 2-3 short paragraphs. Speak directly to the reader like a patient tutor.';
    userPrompt = `Someone is confused about this part of "${topic}": "${req.body.subtopic}". Explain it simply and interactively.`;
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
        max_tokens: ['quiz','flashcards','doubts'].includes(level) ? 1200 : 800,
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
    return res.status(500).json({ error: 'Failed to reach AI service.' });
  }
}
