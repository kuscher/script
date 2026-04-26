import { replaceSelectionWithReSelect, setToneEditingRange, getSelectionCoords, clearSelection, copySelection, cutSelection, expandSelectionToSentence } from './editor.js';
import { createIcons, icons } from 'lucide';

let bubble, container, slider, placeholder, labelBlunt, labelDiplomatic, btnToneUndo;
let state = {
  originalText: '',
  currentRange: null,
  isDragging: false,
  debounceTimer: null,
  activeRequest: null
};

let loadingInterval;
let loadingTextIndex = 0;
let loadingDots = 0;
const loadingStrings = ["combulating", "pondering", "sophisticating", "kuscherifying"];

function startToneLoadingAnimation() {
  const titleEl = document.querySelector('.tone-panel-title');
  if (!titleEl) return;
  
  if (loadingInterval) clearInterval(loadingInterval);
  
  loadingTextIndex = 0;
  loadingDots = 0;
  
  loadingInterval = setInterval(() => {
    loadingDots = (loadingDots + 1) % 4;
    let dots = '';
    for (let i = 0; i < loadingDots; i++) dots += '.';
    
    // Capitalize the first letter
    const str = loadingStrings[loadingTextIndex];
    const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
    
    titleEl.innerText = capitalized + dots;
    
    // occasionally swap string
    if (Math.random() > 0.8) {
       loadingTextIndex = (loadingTextIndex + 1) % loadingStrings.length;
    }
  }, 400);
}

function stopToneLoadingAnimation() {
  const titleEl = document.querySelector('.tone-panel-title');
  if (loadingInterval) clearInterval(loadingInterval);
  loadingInterval = null;
  if (titleEl) titleEl.innerText = "Adjust Tone";
}

export function initToneSlider() {
  bubble = document.getElementById('ai-selection-bubble');
  container = document.getElementById('tone-slider-container');
  slider = document.getElementById('tone-slider');
  placeholder = document.getElementById('tone-placeholder');
  labelBlunt = document.getElementById('tone-label-blunt');
  labelDiplomatic = document.getElementById('tone-label-diplomatic');
  btnToneUndo = document.getElementById('btn-tone-undo');
  const btnCloseAiBubble = document.getElementById('btn-close-ai-bubble');

  if (!container || !slider || !bubble) return;

  const btnCopy = document.getElementById('btn-ai-copy');
  const btnCut = document.getElementById('btn-ai-cut');
  const btnSmart = document.getElementById('btn-ai-smart');

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      copySelection();
      btnCopy.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: #22C55E;"></i> Copied!';
      createIcons({ icons, nameAttr: 'data-lucide' });
      setTimeout(() => {
        bubble.classList.remove('visible');
        clearSelection();
        btnCopy.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i> Copy';
        createIcons({ icons, nameAttr: 'data-lucide' });
      }, 800);
    });
  }

  if (btnCut) {
    btnCut.addEventListener('click', () => {
      cutSelection();
      bubble.classList.remove('visible');
    });
  }

  if (btnSmart) {
    btnSmart.addEventListener('click', () => {
      if (expandSelectionToSentence()) {
        copySelection();
        btnSmart.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: #22C55E;"></i> Smart Copied!';
        createIcons({ icons, nameAttr: 'data-lucide' });
        setTimeout(() => {
          bubble.classList.remove('visible');
          clearSelection();
          btnSmart.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px; color: #A626A4;"></i> Smart Copy';
          createIcons({ icons, nameAttr: 'data-lucide' });
        }, 1200);
      } else {
        // Fallback to normal copy if expansion wasn't needed
        copySelection();
        btnSmart.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px; color: #22C55E;"></i> Copied!';
        createIcons({ icons, nameAttr: 'data-lucide' });
        setTimeout(() => {
          bubble.classList.remove('visible');
          clearSelection();
          btnSmart.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px; color: #A626A4;"></i> Smart Copy';
          createIcons({ icons, nameAttr: 'data-lucide' });
        }, 1200);
      }
    });
  }

  // Drag logic for AI Bubble
  const dragHandle = document.getElementById('ai-drag-handle');
  if (dragHandle) {
    let isDraggingBubble = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      if (window.innerWidth <= 768) return; // Don't drag on mobile
      isDraggingBubble = true;
      const rect = bubble.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      
      // Prevent text selection while dragging
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingBubble) return;
      e.preventDefault();
      
      let newLeft = e.clientX - dragOffsetX;
      let newTop = e.clientY - dragOffsetY;
      
      // Keep within bounds
      const bubbleWidth = bubble.offsetWidth || 380;
      const bubbleHeight = bubble.offsetHeight || 200;
      
      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft + bubbleWidth > window.innerWidth) newLeft = window.innerWidth - bubbleWidth;
      if (newTop + bubbleHeight > window.innerHeight) newTop = window.innerHeight - bubbleHeight;
      
      bubble.style.left = `${newLeft}px`;
      bubble.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
      isDraggingBubble = false;
    });
  }

  btnCloseAiBubble?.addEventListener('click', () => {
    clearSelection();
    resetState();
  });

  btnToneUndo?.addEventListener('click', () => {
    if (state.originalText && state.currentRange) {
      const restored = replaceSelectionWithReSelect(state.currentRange, state.originalText);
      if (restored) {
        state.currentRange = restored;
        setToneEditingRange(restored);
        slider.value = 50;
        if (btnToneUndo) btnToneUndo.style.display = 'none';
      }
    }
  });

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

export function handleSelectionChange(text, range, isProgrammaticSelection = false) {
  // If we are actively interacting with the slider, ignore editor selection changes 
  // (because our own text replacements will trigger this)
  if (state.isDragging || state.activeRequest) {
     if (range) {
         state.currentRange = range; // Keep track of the new range after replacement
     }
     return;
  }

  // If this selection was triggered programmatically (e.g. Find & Replace)
  if (isProgrammaticSelection) {
    resetState();
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

    // Position the bubble on desktop based on mouse cursor
    if (bubble && range) {
      if (text && text.trim().length > 0) {
        if (window.innerWidth > 768 && window.lastMouseX !== undefined) {
          // Temporarily show to get dimensions
          bubble.style.visibility = 'hidden';
          bubble.classList.add('visible');
          
          // Position to the bottom right of cursor
          let left = window.lastMouseX + 15;
          let top = window.lastMouseY + 15;
          
          // Keep it within window bounds
          const bubbleWidth = bubble.offsetWidth || 380;
          const bubbleHeight = bubble.offsetHeight || 200;
          
          if (left + bubbleWidth > window.innerWidth) {
            left = window.lastMouseX - bubbleWidth - 15; // flip left
            if (left < 10) left = 10;
          }
          if (top + bubbleHeight > window.innerHeight) {
            top = window.lastMouseY - bubbleHeight - 15; // flip top
            if (top < 10) top = 10;
          }
          
          bubble.style.left = `${left}px`;
          bubble.style.top = `${top}px`;
          bubble.style.visibility = 'visible';
        } else {
          // On mobile, just show it (CSS handles fixed positioning)
          bubble.classList.add('visible');
        }
      }
    }
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
  startToneLoadingAnimation();

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
       // Make sure to add one line break at the end
       const finalAnswer = answer.endsWith('\n') ? answer : answer + '\n';
       
       // Replace and update range
       const newRange = replaceSelectionWithReSelect(state.currentRange, finalAnswer);
       if (newRange) {
         state.currentRange = newRange;
         setToneEditingRange(newRange); // Re-sync the purple pulse highlight
         if (btnToneUndo) btnToneUndo.style.display = 'flex';
         
         // The bubble is now pinned to the bottom globally via CSS
       }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Tone rewrite failed:', err);
    }
  } finally {
    if (state.activeRequest === controller) {
      state.activeRequest = null;
      stopToneLoadingAnimation();
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
  if (btnToneUndo) btnToneUndo.style.display = 'none';
  if (bubble) {
    bubble.classList.remove('visible');
  }
  setToneEditingRange(null);
}

export function hideAiBubble() {
  if (bubble) {
    bubble.classList.remove('visible');
  }
}
