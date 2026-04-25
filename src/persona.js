import { getEditorContent, getEditorSelectionText } from './editor.js';
import { hideAiBubble } from './tone-slider.js';

let toggleBtn, overlay, closeBtn, personaPills, feedbackText;
let currentPersona = 'mom';
let activeRequest = null;
let isVisible = false;

export function initPersonaFeedback() {
  toggleBtn = document.getElementById('btn-persona-toggle');
  overlay = document.getElementById('persona-feedback-overlay');
  closeBtn = document.getElementById('btn-persona-close');
  personaPills = document.querySelectorAll('.persona-pill');
  feedbackText = document.getElementById('persona-feedback-text');

  if (!toggleBtn || !overlay || !closeBtn || !feedbackText) return;

  toggleBtn.addEventListener('click', toggleOverlay);
  closeBtn.addEventListener('click', hideOverlay);

  personaPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const persona = e.target.getAttribute('data-persona');
      if (persona !== currentPersona) {
        setPersona(persona);
      }
    });
  });
}

function toggleOverlay() {
  hideAiBubble();
  isVisible = !isVisible;
  if (isVisible) {
    overlay.classList.remove('hidden');
    toggleBtn.classList.add('active');
    fetchFeedback();
  } else {
    hideOverlay();
  }
}

function hideOverlay() {
  isVisible = false;
  overlay.classList.add('hidden');
  toggleBtn.classList.remove('active');
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
  }
}

function setPersona(persona) {
  currentPersona = persona;
  personaPills.forEach(p => {
    if (p.getAttribute('data-persona') === persona) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  
  // Re-fetch feedback when persona changes
  if (isVisible) {
    fetchFeedback();
  }
}

async function fetchFeedback() {
  const text = getEditorSelectionText() || getEditorContent();
  
  if (!text || text.trim() === '') {
    feedbackText.innerHTML = '<em>Write something first to get feedback!</em>';
    feedbackText.classList.remove('loading');
    return;
  }

  feedbackText.innerHTML = 'Hmm, let me see...';
  feedbackText.classList.add('loading');

  if (activeRequest) {
    activeRequest.abort();
  }

  const controller = new AbortController();
  activeRequest = controller;

  try {
    const res = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, persona: currentPersona }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    
    if (activeRequest !== controller) return;

    let answer = '';
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      answer = data.candidates[0].content.parts[0].text.trim();
    } else if (data.error) {
       answer = `Error: ${data.error}`;
    }

    feedbackText.innerHTML = answer || '<em>No feedback available.</em>';
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Persona feedback failed:', err);
      feedbackText.innerHTML = '<em style="color:var(--danger)">Failed to get feedback. Please check your connection or API key.</em>';
    }
  } finally {
    if (activeRequest === controller) {
      activeRequest = null;
      feedbackText.classList.remove('loading');
    }
  }
}
