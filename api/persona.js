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
    const { text, persona } = body;

    if (!text || !persona) {
      return new Response(JSON.stringify({ error: 'Missing text or persona parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let systemInstruction = "";
    if (persona === 'mom') {
      systemInstruction = "You are the user's Mom. Read their document and provide highly motivational, supportive, and extremely positive feedback. Be encouraging and loving. Give your feedback in exactly 2 to 3 sentences.";
    } else if (persona === 'boss') {
      systemInstruction = "You are the user's demanding, strict, and highly critical Boss. Read their document and provide negative feedback, pointing out every little missing thing. Be very demanding. Give your feedback in exactly 2 to 3 sentences.";
    } else if (persona === 'hipster') {
      systemInstruction = "You are a total hipster who could not care less. Read their document and provide extremely apathetic, pretentious hipster feedback. Act like you are barely paying attention and everything is too mainstream. Give your feedback in exactly 2 to 3 sentences.";
    } else if (persona === 'kuscher') {
      systemInstruction = "You are a disappointed German dad with a thick, written German accent. Read their document and provide highly critical feedback. You must somehow bring beer and pretzels into the conversation naturally. Give your feedback in exactly 2 to 3 sentences.";
    } else {
      systemInstruction = "You are a helpful AI. Provide brief feedback on this document in 2 to 3 sentences.";
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\nDocument text: "${text}"` }] }],
        generationConfig: { maxOutputTokens: 250 }
      })
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in persona proxy:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
