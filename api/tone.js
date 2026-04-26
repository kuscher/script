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
    
    if (userLimit.count > 20) { // Slightly higher limit for live slider (20 req/min)
      return new Response(JSON.stringify({ error: 'Rate limit exceeded for tone slider.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json();
    const { text, toneValue } = body; // toneValue 0-100

    if (text === undefined || toneValue === undefined) {
      return new Response(JSON.stringify({ error: 'Missing text or toneValue parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a writing assistant. Rewrite the provided text with a specific tone. 
The tone is specified as a number from 0 to 100.
0 = Extremely blunt, direct, concise, no pleasantries.
100 = Highly diplomatic, extremely polite, tactful, and considerate.
The requested tone level is: ${toneValue}.
Do not add any conversational filler. Only return the rewritten text natively. Match the language of the original text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nText to rewrite: "${text}"` }] }],
        generationConfig: { maxOutputTokens: 2000 }
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in tone proxy:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
