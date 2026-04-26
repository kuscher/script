export const config = {
  runtime: 'edge',
};

const rateLimit = new Map();
const MAX_REQUESTS_PER_MINUTE = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const data = rateLimit.get(ip);
  if (!data || now > data.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (data.count >= MAX_REQUESTS_PER_MINUTE) return false;
  data.count++;
  return true;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text, language } = await req.json();

    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Text too short' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `You are an expert editor. Format the following unstructured text into beautiful, structured Markdown. Add logical headers, bullet points for lists, and bold important keywords where logically appropriate to improve readability. Do NOT change the core meaning, tone, or remove any information. Only return the raw formatted Markdown text, without any \`\`\`markdown code blocks wrapping it. Respond in the language code: ${language || 'en'}\n\n${text}` }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let formattedText = text;
    
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      formattedText = data.candidates[0].content.parts[0].text.trim();
      // Remove any trailing or leading markdown code block wrappers if Gemini ignored instructions
      if (formattedText.startsWith('```markdown')) {
        formattedText = formattedText.substring(11).trim();
      }
      if (formattedText.startsWith('```')) {
        formattedText = formattedText.substring(3).trim();
      }
      if (formattedText.endsWith('```')) {
        formattedText = formattedText.substring(0, formattedText.length - 3).trim();
      }
    }

    return new Response(JSON.stringify({ formattedText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Format error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
