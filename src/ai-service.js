import { getSettings } from './settings.js';

// Rate limiting and token tracking logic
function checkTokenLimit(text) {
  if (!text) return;
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    return; // Bypass limits for BYOT
  }
  const estimatedTokens = Math.ceil(text.length / 4);
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  let usage = JSON.parse(localStorage.getItem('ai_usage') || '{}');
  
  if (!usage.firstUsedDate) usage.firstUsedDate = today;
  if (usage.currentDate !== today) {
    usage.currentDate = today;
    usage.dailyTokens = 0;
  }
  
  if (!usage.minuteWindow || now - usage.minuteWindow > 60000) {
    usage.minuteWindow = now;
    usage.minuteTokens = 0;
  }
  
  const isFirstDay = usage.firstUsedDate === today;
  const DAILY_LIMIT = isFirstDay ? 500000 : 100000;
  const MINUTE_LIMIT = 30000;
  
  if (usage.minuteTokens + estimatedTokens > MINUTE_LIMIT) {
    throw new Error('You are generating too fast. Please wait a minute.');
  }
  
  if (usage.dailyTokens + estimatedTokens > DAILY_LIMIT) {
    throw new Error(`Daily AI limit reached (${DAILY_LIMIT.toLocaleString()} tokens). Please try again tomorrow.`);
  }
  
  usage.minuteTokens += estimatedTokens;
  usage.dailyTokens += estimatedTokens;
  
  localStorage.setItem('ai_usage', JSON.stringify(usage));
}

// Centralize the AI logic here
export async function generateAutoName(text) {
  checkTokenLimit(text);
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const prompt = `Read the following document text and suggest a snappy, highly relevant title (max 5 words), a single representative emoji, and the correct file extension based on the content (e.g. .md, .txt, .js, .py, .html). Return ONLY JSON.\n\n${text.substring(0, 3000)}`;
    const resultText = await fetchByot(prompt, settings.geminiApiKey, 150, true);
    return JSON.parse(resultText);
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/autoname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Cloud API failed');
    return res.json();
  } else {
    // Fallback to window.ai
    return localAutoName(text);
  }
}

export async function generateFormat(text) {
  checkTokenLimit(text);
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const prompt = `You are an expert editor. Format the following unstructured text into beautiful, structured Markdown. Add logical headers, bullet points for lists, and bold important keywords where logically appropriate to improve readability. Do NOT change the core meaning, tone, or remove any information. Only return the raw formatted Markdown text, without any \`\`\`markdown code blocks wrapping it.\n\n${text}`;
    let formattedText = await fetchByot(prompt, settings.geminiApiKey, 8192);
    if (formattedText.startsWith('```markdown')) formattedText = formattedText.substring(11).trim();
    if (formattedText.startsWith('```')) formattedText = formattedText.substring(3).trim();
    if (formattedText.endsWith('```')) formattedText = formattedText.substring(0, formattedText.length - 3).trim();
    return { formattedText };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Cloud API failed');
    return res.json();
  } else {
    return localFormat(text);
  }
}

export async function generateTone(text, toneValue, signal) {
  checkTokenLimit(text);
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const systemPrompt = `You are a writing assistant. Rewrite the provided text with a specific tone. 
The tone is specified as a number from 0 to 100.
0 = Extremely blunt, direct, concise, no pleasantries.
100 = Highly diplomatic, extremely polite, tactful, and considerate.
The requested tone level is: ${toneValue}.
Do not add any conversational filler. Only return the rewritten text natively. Match the language of the original text.`;
    const rewrittenText = await fetchByot(`${systemPrompt}\n\nText to rewrite: "${text}"`, settings.geminiApiKey, 8192, false, signal);
    return { rewrittenText };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, toneValue }),
      signal
    });
    if (!res.ok) throw new Error('Cloud API failed');
    const data = await res.json();
    let rewrittenText = '';
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      rewrittenText = data.candidates[0].content.parts[0].text.trim();
    }
    return { rewrittenText };
  } else {
    return localTone(text, toneValue);
  }
}

export async function generatePersona(text, persona) {
  checkTokenLimit(text);
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    let systemInstruction = "You are Kuscher, a brilliant but brutally honest senior software engineer and writing critic. The user has written the following text. Give them a 2-3 sentence extremely blunt, unfiltered critique of the logic, tone, or quality of the text. Do not be polite. Point out exactly what is stupid or could be better. No greetings or pleasantries, just jump straight into the critique.";
    if (persona === 'yoda') systemInstruction = "You are Yoda from Star Wars. Critique the following text briefly in the speaking style of Yoda.";
    if (persona === 'shakespeare') systemInstruction = "You are William Shakespeare. Critique the following text briefly using Early Modern English, poetic flair, and dramatic theatrical phrasing.";
    
    const feedback = await fetchByot(`${systemInstruction}\n\nDocument text: "${text}"`, settings.geminiApiKey, 8192);
    return { feedback };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona })
    });
    if (!res.ok) throw new Error('Cloud API failed');
    const data = await res.json();
    let feedback = '';
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      feedback = data.candidates[0].content.parts[0].text.trim();
    }
    return { feedback };
  } else {
    return localPersona(text, persona);
  }
}

export async function generateMention(query) {
  checkTokenLimit(query);
  const settings = getSettings();
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const prompt = "System prompt: Answer perfectly concisely in 15 words or less. Reply in absolute facts with zero conversational preamble. Do not repeat the subject of the context. Provide only the direct answer.\nQuery: " + query;
    const answer = await fetchByot(prompt, settings.geminiApiKey, 8192);
    return { answer };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Cloud API failed');
    const data = await res.json();
    let answer = '';
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      answer = data.candidates[0].content.parts[0].text.trim();
    }
    return { answer };
  } else {
    return localMention(query);
  }
}

// --- BYOT AI FETCH HELPER ---
async function fetchByot(prompt, apiKey, maxTokens = 8192, jsonMode = false, signal = null) {
  const config = { maxOutputTokens: maxTokens };
  if (jsonMode) {
    config.responseMimeType = "application/json";
    config.responseSchema = {
      type: "object",
      properties: { title: { type: "string" }, emoji: { type: "string" }, extension: { type: "string" } },
      required: ["title", "emoji", "extension"]
    };
  }
  
  const fetchOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: config
    })
  };
  if (signal) fetchOpts.signal = signal;
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, fetchOpts);
  if (!res.ok) throw new Error('BYOT API failed');
  const data = await res.json();
  if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  throw new Error("No response");
}

// --- LOCAL AI FALLBACKS ---

async function getLocalSession() {
  if (!('ai' in window) || !('languageModel' in window.ai)) {
    throw new Error('window.ai is not available in this browser. Please use Chrome with Gemini Nano enabled.');
  }
  const capabilities = await window.ai.languageModel.capabilities();
  if (capabilities.available === 'no') {
    throw new Error('Local AI is not available or not downloaded yet.');
  }
  return await window.ai.languageModel.create();
}

async function localAutoName(text) {
  const session = await getLocalSession();
  const prompt = `Read the following document text and suggest a snappy, highly relevant title (max 5 words), a single representative emoji, and the correct file extension based on the content (e.g. .md, .txt, .js, .py, .html). Return ONLY JSON in this format: {"title": "...", "emoji": "...", "extension": "..."}.\n\nText:\n${text.substring(0, 3000)}`;
  
  try {
    const result = await session.prompt(prompt);
    // window.ai doesn't guarantee pure JSON, so we parse carefully
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);
    return data;
  } catch (e) {
    console.error("Local AutoName JSON parse failed", e);
    return { title: "Untitled", emoji: "📄", extension: ".txt" };
  }
}

async function localFormat(text) {
  const session = await getLocalSession();
  const prompt = `You are an expert editor. Format the following unstructured text into beautiful, structured Markdown. Add logical headers, bullet points for lists, and bold important keywords where logically appropriate to improve readability. Do NOT change the core meaning, tone, or remove any information. Only return the raw formatted Markdown text, without any \`\`\`markdown code blocks wrapping it.\n\nText:\n${text}`;
  
  const result = await session.prompt(prompt);
  let formattedText = result.trim();
  if (formattedText.startsWith('```markdown')) formattedText = formattedText.substring(11).trim();
  if (formattedText.startsWith('```')) formattedText = formattedText.substring(3).trim();
  if (formattedText.endsWith('```')) formattedText = formattedText.substring(0, formattedText.length - 3).trim();
  
  return { formattedText };
}

async function localTone(text, toneValue) {
  const session = await getLocalSession();
  let toneInstruction = '';
  if (toneValue < 33) {
    toneInstruction = 'blunt, concise, and direct';
  } else if (toneValue > 66) {
    toneInstruction = 'diplomatic, polite, and extremely professional';
  } else {
    toneInstruction = 'neutral, clear, and balanced';
  }
  
  const prompt = `Rewrite the following text so that the tone is ${toneInstruction}. Do not change the fundamental meaning or add new facts. Output ONLY the rewritten text, without any quotes or explanations.\n\nText: "${text}"`;
  const result = await session.prompt(prompt);
  return { rewrittenText: result.trim() };
}

async function localPersona(text, persona) {
  const session = await getLocalSession();
  
  let personaDesc = "Kuscher, a brilliant but brutally honest senior software engineer and writing critic. The user has written the following text. Give them a 2-3 sentence extremely blunt, unfiltered critique of the logic, tone, or quality of the text. Do not be polite. Point out exactly what is stupid or could be better.";
  if (persona === 'yoda') personaDesc = "Yoda from Star Wars. Critique the text briefly in the speaking style of Yoda.";
  if (persona === 'shakespeare') personaDesc = "William Shakespeare. Critique the text briefly using Early Modern English, poetic flair, and dramatic theatrical phrasing.";
  
  const prompt = `You are ${personaDesc} No greetings or pleasantries, just jump straight into the critique.\n\nText: "${text.substring(0, 1500)}"`;
  
  const result = await session.prompt(prompt);
  return { feedback: result.trim() };
}

async function localMention(query) {
  const session = await getLocalSession();
  const prompt = `Answer the following query briefly and directly. The answer will be injected inline into the user's document, so do not include conversational filler like "Here is the answer". Just provide the raw fact or completion.\n\nQuery: ${query}`;
  
  const result = await session.prompt(prompt);
  return { answer: result.trim() };
}
