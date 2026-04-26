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
  const DAILY_LIMIT = isFirstDay ? 100000 : 30000;
  const MINUTE_LIMIT = 15000;
  
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
  const lang = localStorage.getItem('i18nextLng') || 'en';
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const prompt = `Read the following document text and suggest a snappy, highly relevant title (max 5 words), a single representative emoji, and the correct file extension based on the content (e.g. .md, .txt, .js, .py, .html). Return ONLY JSON. Respond in the language code: ${lang}\n\n${text.substring(0, 3000)}`;
    const resultText = await fetchByot(prompt, settings.geminiApiKey, 150, true);
    return JSON.parse(resultText);
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/autoname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang })
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

export async function generateToneRewrite(text, toneValue, signal) {
  checkTokenLimit(text);
  const settings = getSettings();
  const lang = localStorage.getItem('i18nextLng') || 'en';
  
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    let systemPrompt = `You are an expert writing assistant. Rewrite the following text. Preserve the original meaning but change the tone to be exactly ${toneValue}% where 0% is extremely blunt, concise, and brutally direct, and 100% is extremely diplomatic, polite, and padded with pleasantries. 50% is neutral. Output ONLY the rewritten text, nothing else. Respond in the language code: ${lang}.`;
    
    if (toneValue < 30) {
      systemPrompt = `You are a brutally concise editor. Rewrite the text to be as blunt and direct as possible. Remove all fluff. Tone level: ${toneValue}%. Output ONLY the rewritten text. Respond in the language code: ${lang}.`;
    } else if (toneValue > 70) {
      systemPrompt = `You are a highly diplomatic, corporate communications expert. Rewrite the text to be extremely polite, gentle, and padded with pleasantries. Tone level: ${toneValue}%. Output ONLY the rewritten text. Respond in the language code: ${lang}.`;
    }

    const rewrittenText = await fetchByot(`${systemPrompt}\n\nText to rewrite: "${text}"`, settings.geminiApiKey, 8192, false, signal);
    return { rewrittenText };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, toneValue, language: lang }),
      signal
    });
    if (!res.ok) throw new Error('Cloud API failed');
    const data = await res.json();
    let rewrittenText = '';
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      rewrittenText = data.candidates[0].content.parts[0].text.trim();
    } else {
      console.warn("Unexpected Gemini response:", data);
    }
    return { rewrittenText };
  } else {
    return localTone(text, toneValue);
  }
}

export async function generatePersona(text, persona) {
  checkTokenLimit(text);
  const settings = getSettings();
  const lang = localStorage.getItem('i18nextLng') || 'en';
  
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    let systemInstruction = `You are Kuscher, a brilliant but brutally honest senior software engineer and writing critic. The user has written the following text. Give them a 2-3 sentence extremely blunt, unfiltered critique of the logic, tone, or quality of the text. Do not be polite. Point out exactly what is stupid or could be better. No greetings or pleasantries, just jump straight into the critique. Respond in the language code: ${lang}.`;
    if (persona === 'yoda') systemInstruction = `You are Yoda from Star Wars. Critique the following text briefly in the speaking style of Yoda. Respond in the language code: ${lang}.`;
    if (persona === 'shakespeare') systemInstruction = `You are William Shakespeare. Critique the following text briefly using Early Modern English, poetic flair, and dramatic theatrical phrasing. Respond in the language code: ${lang}.`;
    
    const feedback = await fetchByot(`${systemInstruction}\n\nDocument text: "${text}"`, settings.geminiApiKey, 8192);
    return { feedback };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona, language: lang })
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
  const lang = localStorage.getItem('i18nextLng') || 'en';
  
  if (settings.aiProvider === 'byot' && settings.geminiApiKey) {
    const prompt = `System prompt: Answer perfectly concisely in 15 words or less. Reply in absolute facts with zero conversational preamble. Do not repeat the subject of the context. Provide only the direct answer. Respond in the language code: ${lang}.\nQuery: ` + query;
    const answer = await fetchByot(prompt, settings.geminiApiKey, 8192);
    return { answer };
  } else if (settings.aiProvider === 'cloud') {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language: lang })
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
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  console.warn("Unexpected BYOT Gemini response:", data);
  throw new Error("No response or safety block");
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
