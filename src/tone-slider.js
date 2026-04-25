import { replaceSelectionWithReSelect, setToneEditingRange } from './editor.js';

let container, slider, placeholder, labelBlunt, labelDiplomatic;
let state = {
  originalText: '',
  currentRange: null,
  isDragging: false,
  debounceTimer: null,
  activeRequest: null
};

export function initToneSlider() {
  container = document.getElementById('tone-slider-container');
  slider = document.getElementById('tone-slider');
  placeholder = document.getElementById('tone-placeholder');
  labelBlunt = document.getElementById('tone-label-blunt');
  labelDiplomatic = document.getElementById('tone-label-diplomatic');

  if (!container || !slider) return;

  slider.addEventListener('input', (e) => {
    state.isDragging = true;
    setToneEditingRange(state.currentRange);
    const toneValue = parseInt(e.target.value, 10);
    
    // Debounce the API call
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      triggerRewrite(toneValue);
    }, 400); // 400ms debounce
  });

  slider.addEventListener('change', () => {
    state.isDragging = false;
    if (!state.activeRequest) setToneEditingRange(null);
  });
}

export function handleSelectionChange(text, range) {
  // If we are actively interacting with the slider, ignore editor selection changes 
  // (because our own text replacements will trigger this)
  if (state.isDragging || state.activeRequest) {
     if (range) {
         state.currentRange = range; // Keep track of the new range after replacement
     }
     return;
  }

  if (text && text.trim().length > 0) {
    state.originalText = text;
    state.currentRange = range;
    slider.value = 50; // Reset slider
    placeholder?.classList.add('hidden');
    labelBlunt?.classList.remove('hidden');
    labelDiplomatic?.classList.remove('hidden');
    slider.classList.remove('hidden');
    setToneEditingRange(range);
  } else {
    resetState();
  }
}

async function triggerRewrite(toneValue) {
  if (!state.originalText) return;
  
  // Abort previous if pending
  if (state.activeRequest) {
    state.activeRequest.abort();
  }

  const controller = new AbortController();
  state.activeRequest = controller;
  setToneEditingRange(state.currentRange);

  try {
    const res = await fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.originalText, toneValue }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    
    let answer = '';
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      answer = data.candidates[0].content.parts[0].text.trim();
    }

    if (answer && state.currentRange && state.activeRequest === controller) {
       // Replace and update range
       const newRange = replaceSelectionWithReSelect(state.currentRange, answer);
       if (newRange) {
         state.currentRange = newRange;
       }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Tone rewrite failed:', err);
    }
  } finally {
    if (state.activeRequest === controller) {
      state.activeRequest = null;
    }
  }
}

function resetState() {
  state = {
    originalText: '',
    currentRange: null,
    isDragging: false,
    debounceTimer: null,
    activeRequest: null
  };
  placeholder?.classList.remove('hidden');
  labelBlunt?.classList.add('hidden');
  labelDiplomatic?.classList.add('hidden');
  slider?.classList.add('hidden');
  setToneEditingRange(null);
}
