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
    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Text too short' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit text to first 3000 chars to save tokens, it's just for a title
    const truncatedText = text.substring(0, 3000);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: "Read the following document text and suggest a snappy, highly relevant title (max 5 words), a single representative emoji, and the correct file extension based on the content (e.g. .md, .txt, .js, .py, .html). Return ONLY JSON.\n\n" + truncatedText }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              emoji: { type: "string" },
              extension: { type: "string" }
            },
            required: ["title", "emoji", "extension"]
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let result = { title: "Untitled Document", emoji: "📄" };
    
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      try {
        result = JSON.parse(data.candidates[0].content.parts[0].text.trim());
      } catch (e) {
        console.error("Failed to parse JSON from Gemini:", e);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto-name error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
