import { Redis } from '@upstash/redis';

// Initialize Redis client using environment variables
// This automatically picks up KV_REST_API_URL and KV_REST_API_TOKEN
// Alternatively, UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN can be used
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  
  if (!key || typeof key !== 'string' || key.length < 8) {
    return new Response(JSON.stringify({ error: 'Invalid or missing sync key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Prefix the key to ensure it only accesses synced notes
  const redisKey = `synced-note:${key}`;

  if (req.method === 'GET') {
    try {
      const content = await redis.get(redisKey);
      return new Response(JSON.stringify({ content: content || '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error reading from KV:', error);
      return new Response(JSON.stringify({ error: 'Failed to read note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { content } = await req.json();
      
      if (typeof content !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid content format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Enforce a maximum note size (e.g., 500KB)
      if (content.length > 500000) {
        return new Response(JSON.stringify({ error: 'Note exceeds maximum size limit (500KB)' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await redis.set(redisKey, content);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error writing to KV:', error);
      return new Response(JSON.stringify({ error: 'Failed to write note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
