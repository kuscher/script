export const config = {
  runtime: 'edge',
};

const rateLimit = new Map();

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Basic in-memory rate limiting (per isolate)
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (ip !== 'unknown') {
    const now = Date.now();
    const userLimit = rateLimit.get(ip) || { count: 0, startTime: now };
    
    if (now - userLimit.startTime > 60000) { // 1 minute window
      userLimit.count = 1;
      userLimit.startTime = now;
    } else {
      userLimit.count++;
    }
    
    rateLimit.set(ip, userLimit);
    
    if (userLimit.count > 20) { // 20 requests per minute limit
      return new Response(JSON.stringify({ error: 'Too many requests, please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "System prompt: Answer perfectly concisely in 15 words or less. Reply in absolute facts with zero conversational preamble. Do not repeat the subject of the context. Provide only the direct answer.\nQuery: " + query }] }],
        generationConfig: { maxOutputTokens: 500 }
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini proxy:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
