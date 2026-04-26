import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/core';
import { createLowlight, common } from 'lowlight';
import { AiMention } from './ai-mention.js';

const lowlight = createLowlight(common);

let onSelectionChangeCallback = null;
let isMouseDraggingNative = false;

const startNativeDrag = (e) => {
  if (e.target.closest('.custom-selection-handle')) return;
  isMouseDraggingNative = true;
  updateCustomHandlesPosition(); // Instantly hide them
};

const endNativeDrag = () => {
  if (isMouseDraggingNative) {
    isMouseDraggingNative = false;
    // Force a position update now that drag finished
    setTimeout(() => {
      if (typeof updateCustomHandlesPosition === 'function') {
        updateCustomHandlesPosition();
      }
    }, 10);
  }
};

window.addEventListener('mousedown', startNativeDrag);
window.addEventListener('touchstart', startNativeDrag, { passive: true });

window.addEventListener('mouseup', endNativeDrag);
window.addEventListener('touchend', endNativeDrag);

// Custom Selection Handles DOM Elements
let handleStartEl = null;
let handleEndEl = null;
let activeDragHandle = null;

function initCustomHandles() {
  if (handleStartEl) return;
  handleStartEl = document.createElement('div');
  handleStartEl.className = 'custom-selection-handle handle-start';
  handleStartEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>`;
  
  handleEndEl = document.createElement('div');
  handleEndEl.className = 'custom-selection-handle handle-end';
  handleEndEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>`;

  document.body.appendChild(handleStartEl);
  document.body.appendChild(handleEndEl);

  const startDrag = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    activeDragHandle = handleType;
  };

  const onDrag = (e) => {
    if (!activeDragHandle || !editor) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const posAtCoords = editor.view.posAtCoords({ left: clientX, top: clientY });
    if (!posAtCoords) return;

    let { from, to } = editor.state.selection;
    if (activeDragHandle === 'start') {
      from = Math.min(posAtCoords.pos, to - 1);
    } else {
      to = Math.max(posAtCoords.pos, from + 1);
    }

    isProgrammaticSelection = true;
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));
    isProgrammaticSelection = false;
  };

  const endDrag = () => {
    if (activeDragHandle && editor && onSelectionChangeCallback) {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        const text = editor.state.doc.textBetween(from, to, '\n');
        onSelectionChangeCallback(text, { from, to }, false); // Trigger AI bubble
      }
    }
    activeDragHandle = null;
  };

  handleStartEl.addEventListener('touchstart', (e) => startDrag(e, 'start'), { passive: false });
  handleStartEl.addEventListener('mousedown', (e) => startDrag(e, 'start'));
  
  handleEndEl.addEventListener('touchstart', (e) => startDrag(e, 'end'), { passive: false });
  handleEndEl.addEventListener('mousedown', (e) => startDrag(e, 'end'));

  window.addEventListener('touchmove', onDrag, { passive: false });
  window.addEventListener('mousemove', onDrag);

  window.addEventListener('touchend', endDrag);
  window.addEventListener('mouseup', endDrag);

  // Re-position on scroll
  document.querySelector('.app-container')?.addEventListener('scroll', updateCustomHandlesPosition, { passive: true });
  window.addEventListener('resize', updateCustomHandlesPosition, { passive: true });
}

function updateCustomHandlesPosition() {
  if (!editor || !handleStartEl || !handleEndEl) return;
  const { from, to, empty } = editor.state.selection;
  if (empty || isMouseDraggingNative) {
    handleStartEl.style.display = 'none';
    handleEndEl.style.display = 'none';
    return;
  }

  try {
    const startCoords = editor.view.coordsAtPos(from);
    const endCoords = editor.view.coordsAtPos(to);

    handleStartEl.style.display = 'flex';
    handleStartEl.style.left = `${startCoords.left}px`;
    handleStartEl.style.top = `${startCoords.top}px`;

    handleEndEl.style.display = 'flex';
    handleEndEl.style.left = `${endCoords.right}px`;
    handleEndEl.style.top = `${endCoords.bottom}px`;
  } catch (e) {
    // If coordsAtPos fails (e.g. node not rendered yet), hide handles
    handleStartEl.style.display = 'none';
    handleEndEl.style.display = 'none';
  }
}

export let searchMatches = [];
export let activeSearchIndex = -1;
export let isProgrammaticSelection = false;

let currentSearchTerm = '';
const searchPlugin = new Plugin({
  key: new PluginKey('search'),
  state: {
    init() { return DecorationSet.empty; },
    apply(tr, oldState) {
      const action = tr.getMeta('search-update');
      
      if (!currentSearchTerm) {
        searchMatches = [];
        activeSearchIndex = -1;
        return DecorationSet.empty;
      }
      
      if (!tr.docChanged && action === undefined) {
         return oldState;
      }
      
      searchMatches = [];
      const decorations = [];
      const regex = new RegExp(`(${currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      
      tr.doc.descendants((node, pos) => {
        if (node.isText) {
          const text = node.text;
          let match;
          while ((match = regex.exec(text)) !== null) {
             const from = pos + match.index;
             const to = pos + match.index + match[0].length;
             searchMatches.push({ from, to });
          }
        }
      });
      
      if (action !== undefined && action.activeIndex !== undefined) {
         activeSearchIndex = action.activeIndex;
      }
      
      if (searchMatches.length > 0) {
         if (activeSearchIndex < 0 || activeSearchIndex >= searchMatches.length) {
            activeSearchIndex = 0;
         }
      } else {
         activeSearchIndex = -1;
      }
      
      searchMatches.forEach((m, idx) => {
         const isActive = idx === activeSearchIndex;
         decorations.push(
            Decoration.inline(m.from, m.to, {
               class: isActive ? 'search-highlight search-match-active' : 'search-highlight'
            })
         );
      });
      
      return DecorationSet.create(tr.doc, decorations);
    }
  },
  props: {
    decorations(state) { return this.getState(state); }
  }
});

const SearchHighlight = Extension.create({
  name: 'searchHighlight',
  addProseMirrorPlugins() { return [searchPlugin]; }
});

let currentToneRange = null;
const tonePlugin = new Plugin({
  key: new PluginKey('tone-pulse'),
  state: {
    init() { return DecorationSet.empty; },
    apply(tr, oldState) {
      const action = tr.getMeta('tone-update');
      if (action !== undefined) {
        currentToneRange = action.range;
      } else if (tr.docChanged && currentToneRange) {
        currentToneRange = {
          from: tr.mapping.map(currentToneRange.from),
          to: tr.mapping.map(currentToneRange.to)
        };
      }
      
      if (!currentToneRange || currentToneRange.from === currentToneRange.to) {
         return DecorationSet.empty;
      }
      return DecorationSet.create(tr.doc, [
        Decoration.inline(currentToneRange.from, currentToneRange.to, { class: 'tone-editing-pulse' })
      ]);
    }
  },
  props: {
    decorations(state) { return this.getState(state); }
  }
});

const ToneHighlight = Extension.create({
  name: 'toneHighlight',
  addProseMirrorPlugins() { return [tonePlugin]; }
});

let currentSyntaxLanguage = '';
const syntaxPlugin = new Plugin({
  key: new PluginKey('syntax'),
  state: {
    init() { return DecorationSet.empty; },
    apply(tr, oldState) {
      const action = tr.getMeta('syntax-lang');
      if (action !== undefined) {
        currentSyntaxLanguage = action;
      } else if (!tr.docChanged) {
        return oldState;
      }
      
      if (!currentSyntaxLanguage) return DecorationSet.empty;
      
      const decorations = [];
      tr.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.textContent) {
          try {
            const result = lowlight.highlight(currentSyntaxLanguage, node.textContent);
            let offset = 0;
            function walk(nodes, classes) {
              nodes.forEach(n => {
                if (n.type === 'text') {
                  if (classes.length > 0) {
                    decorations.push(
                      Decoration.inline(pos + 1 + offset, pos + 1 + offset + n.value.length, {
                        class: classes.join(' ')
                      })
                    );
                  }
                  offset += n.value.length;
                } else if (n.type === 'element') {
                  walk(n.children, [...classes, ...(n.properties.className || [])]);
                }
              });
            }
            walk(result.children, []);
          } catch(e) {}
        }
      });
      return DecorationSet.create(tr.doc, decorations);
    }
  },
  props: {
    decorations(state) { return this.getState(state); }
  }
});

const SyntaxHighlight = Extension.create({
  name: 'syntaxHighlight',
  addProseMirrorPlugins() { return [syntaxPlugin]; }
});

let editor;
let updateCallback = null;

export function initEditor(containerId, initialContent, onChange, onSelectionChange) {
  updateCallback = onChange;
  onSelectionChangeCallback = onSelectionChange;
  const container = document.getElementById(containerId);
  if (!container) return;
  
  editor = new Editor({
    element: container,
    editorProps: {
      clipboardTextSerializer: (slice) => {
        const blocks = [];
        slice.content.forEach((node) => {
          blocks.push(node.textContent);
        });
        return blocks.join('\n');
      }
    },
    extensions: [
      Document,
      History,
      Paragraph,
      Text,
      SearchHighlight,
      SyntaxHighlight,
      ToneHighlight,
      AiMention,
      Placeholder.configure({ placeholder: 'Start typing...' })
    ],
    content: formatContentForTiptap(initialContent),
    onUpdate: ({ editor }) => {
      if (updateCallback) {
        // Debounce or just pass through
        const raw = extractContentFromTiptap(editor.getJSON());
        updateLineNumbers(raw);
        updateCallback(raw);
      }
      updateCustomHandlesPosition();
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        const { from, to, empty } = editor.state.selection;
        
        // Suppress keyboard on mobile during text selection globally
        // We now use our own custom selection handles, so we can hide the OS keyboard on both iOS and Android
        if (window.innerWidth <= 768) {
          if (!empty) {
            editor.view.dom.setAttribute('inputmode', 'none');
          } else {
            editor.view.dom.removeAttribute('inputmode');
          }
        }
        
        updateCustomHandlesPosition();
        
        if (empty) {
          onSelectionChange('', null, isProgrammaticSelection);
        } else {
          const text = editor.state.doc.textBetween(from, to, '\n');
          onSelectionChange(text, { from, to }, isProgrammaticSelection);
        }
      }
    },
    onTransaction: ({ editor }) => {
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      if (btnUndo) btnUndo.disabled = !editor.can().undo();
      if (btnRedo) btnRedo.disabled = !editor.can().redo();
    }
  });
  
  updateLineNumbers(initialContent);
  initCustomHandles();
  return editor;
}

export function setEditorContent(text) {
  if (!editor) return;
  const currentText = extractContentFromTiptap(editor.getJSON());
  if (currentText !== text) {
    editor.commands.setContent(formatContentForTiptap(text));
    updateLineNumbers(text);
  }
}

export function getEditorContent() {
  if (!editor) return '';
  return extractContentFromTiptap(editor.getJSON());
}

export function getEditorSelectionText() {
  if (!editor) return '';
  const { from, to, empty } = editor.state.selection;
  if (empty) return '';
  return editor.state.doc.textBetween(from, to, '\n');
}

export function copySelection() {
  const text = getEditorSelectionText();
  if (text) navigator.clipboard.writeText(text);
  return text;
}

export function cutSelection() {
  const text = getEditorSelectionText();
  if (text) {
    navigator.clipboard.writeText(text);
    editor.commands.deleteSelection();
  }
  return text;
}

export function expandSelectionToSentence() {
  if (!editor) return false;
  const { doc, selection } = editor.state;
  if (selection.empty) return false;
  
  let { from, to } = selection;
  const selectedText = doc.textBetween(from, to, '\n');
  
  const isSingleWord = !/\s/.test(selectedText.trim());
  
  if (isSingleWord) {
    while (from > 0) {
      const char = doc.textBetween(from - 1, from, '\n');
      if (!char || /[\s\.,!\?;"'()\[\]\n]/.test(char)) break;
      from--;
    }
    while (to < doc.content.size) {
      const char = doc.textBetween(to, to + 1, '\n');
      if (!char || /[\s\.,!\?;"'()\[\]\n]/.test(char)) break;
      to++;
    }
  } else {
    while (from > 0) {
      const prevChar = doc.textBetween(from - 1, from, '\n');
      if (!prevChar || /[\n]/.test(prevChar)) break;
      const prevPrev = from > 1 ? doc.textBetween(from - 2, from - 1, '\n') : '';
      if (/[\.!\?]/.test(prevPrev) && /\s/.test(prevChar)) break;
      from--;
    }
    while (to < doc.content.size) {
      const char = doc.textBetween(to, to + 1, '\n');
      if (!char || /[\n]/.test(char)) break;
      to++;
      if (/[\.!\?]/.test(char)) {
         const next = to < doc.content.size ? doc.textBetween(to, to + 1, '\n') : '\n';
         if (/[\s\n]/.test(next)) break;
      }
    }
  }
  
  // Only update if it actually expanded
  if (from !== selection.from || to !== selection.to) {
    editor.commands.setTextSelection({ from, to });
    return true;
  }
  return false;
}

export function getSelectionCoords(from, to) {
  if (!editor) return null;
  try {
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    return { top: start.top, bottom: end.bottom, left: start.left, right: end.right };
  } catch (e) {
    return null;
  }
}

export function clearSelection() {
  if (editor) {
    editor.commands.setTextSelection(editor.state.selection.to);
  }
}

export function undo() {
  if (editor) editor.chain().undo().run();
}

export function redo() {
  if (editor) editor.chain().redo().run();
}

export function focusEditor() {
  if (editor) editor.commands.focus();
}

export function setSearchTerm(term) {
  if (currentSearchTerm === term && term !== '') return;
  currentSearchTerm = term;
  if (editor) {
    editor.view.dispatch(editor.state.tr.setMeta('search-update', { activeIndex: 0 }));
    if (searchMatches.length > 0) {
      updateSearchMatchActive(0);
    }
    // notify via UI callback potentially, or callers can check searchMatches.length
  }
}

export function updateSearchMatchActive(index) {
  if (!editor || searchMatches.length === 0) return;
  if (index < 0) index = searchMatches.length - 1;
  else if (index >= searchMatches.length) index = 0;
  
  editor.view.dispatch(editor.state.tr.setMeta('search-update', { activeIndex: index }));
  
  const activeMatch = searchMatches[activeSearchIndex];
  if (activeMatch) {
     isProgrammaticSelection = true;
     editor.chain().setTextSelection({ from: activeMatch.from, to: activeMatch.to }).run();
     isProgrammaticSelection = false;
     setTimeout(() => {
        const activeHighlight = document.querySelector('.search-match-active');
        if (activeHighlight) {
           activeHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
     }, 50);
  }
}

export function findNext() { updateSearchMatchActive(activeSearchIndex + 1); }
export function findPrev() { updateSearchMatchActive(activeSearchIndex - 1); }

export function replaceActive(replaceText) {
  if (!editor || searchMatches.length === 0 || activeSearchIndex < 0) return;
  const match = searchMatches[activeSearchIndex];
  editor.view.dispatch(editor.state.tr.replaceWith(match.from, match.to, editor.state.schema.text(replaceText)));
  
  setTimeout(() => {
     if (searchMatches.length > 0) {
        updateSearchMatchActive(activeSearchIndex);
     }
  }, 10);
}

export function replaceAll(replaceText) {
  if (!editor || searchMatches.length === 0) return;
  const tr = editor.state.tr;
  for (let i = searchMatches.length - 1; i >= 0; i--) {
    const match = searchMatches[i];
    tr.replaceWith(match.from, match.to, editor.state.schema.text(replaceText));
  }
  editor.view.dispatch(tr);
}

export function replaceSelectionWithReSelect(range, newText) {
  if (!editor || !range) return null;
  const { from, to } = range;
  const tr = editor.state.tr;
  
  // insertText natively handles \n by splitting nodes, unlike schema.text()
  tr.insertText(newText, from, to);
  
  editor.view.dispatch(tr);
  
  // Recalculate new to position after insertion
  // Note: insertText may add more than newText.length positions if it creates paragraph nodes.
  // The transaction mapping tells us exactly where 'to' moved to!
  const newTo = tr.mapping.map(from) + newText.length; // Actually mapping to is safer.
  
  // Better yet, since we replaced from..to, the new text starts at `from` and ends at `tr.mapping.map(to)`.
  const exactNewTo = tr.mapping.map(to);
  
  // Re-select using commands
  editor.commands.setTextSelection({ from, to: exactNewTo });
  
  return { from, to: exactNewTo };
}

export function setToneEditingRange(range) {
  if (editor) {
    editor.view.dispatch(editor.state.tr.setMeta('tone-update', { range }));
  }
}

export function setSyntaxLanguage(filename) {
  if (!editor || !filename) return;
  const map = {
    '.js': 'javascript',
    '.css': 'css',
    '.html': 'xml',
    '.htm': 'xml',
    '.json': 'json',
    '.md': 'markdown'
  };
  const ext = Object.keys(map).find(k => filename.toLowerCase().endsWith(k));
  const lang = ext ? map[ext] : '';
  
  if (currentSyntaxLanguage !== lang) {
    editor.view.dispatch(editor.state.tr.setMeta('syntax-lang', lang));
  }
}

export function gotoLine(lineNumber) {
  if (!editor) return;
  const { doc } = editor.state;
  
  if (lineNumber > doc.childCount) {
    lineNumber = doc.childCount;
  }
  if (lineNumber < 1) {
    lineNumber = 1;
  }
  
  // Find the start pos of the target paragraph
  let pos = 0;
  for (let i = 0; i < lineNumber - 1; i++) {
    pos += doc.child(i).nodeSize;
  }
  
  const targetPos = pos + 1; // +1 to move inside the paragraph node
  
  editor.chain().focus().setTextSelection(targetPos).scrollIntoView().run();
}

export function getCursorPosition() {
  if (!editor) return { line: 1, col: 1 };
  const { doc, selection } = editor.state;
  const pos = selection.from;
  const resolvedPos = doc.resolve(pos);
  const line = resolvedPos.index(0) + 1;
  const col = resolvedPos.parentOffset + 1;
  return { line, col };
}

/** Tiptap natively wants block nodes (Paragraphs). 
 * For a plain-text editor, we represent each line as a paragraph. */
function formatContentForTiptap(text) {
  const lines = text.split('\n');
  return {
    type: 'doc',
    content: lines.map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : []
    }))
  };
}

function extractContentFromTiptap(json) {
  if (!json || !json.content) return '';
  return json.content.map(node => {
    if (node.type === 'paragraph') {
      if (!node.content) return '';
      return node.content.map(n => n.text || '').join('');
    }
    return '';
  }).join('\n');
}

function updateLineNumbers(text) {
  const gutter = document.getElementById('line-numbers');
  if (!gutter) return;
  const lines = text.split('\n').length;
  // Use a string array and join for faster DOM updating
  const html = [];
  for (let i = 1; i <= Math.max(1, lines); i++) {
    html.push(`<div>${i}</div>`);
  }
  gutter.innerHTML = html.join('');
}
