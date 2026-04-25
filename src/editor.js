import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/core';
import { createLowlight, common } from 'lowlight';
import { AiMention } from './ai-mention.js';

const lowlight = createLowlight(common);

export let searchMatches = [];
export let activeSearchIndex = -1;

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
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        const { from, to, empty } = editor.state.selection;
        if (empty) {
          onSelectionChange('');
        } else {
          const text = editor.state.doc.textBetween(from, to, '\n');
          onSelectionChange(text, { from, to });
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
     editor.chain().setTextSelection({ from: activeMatch.from, to: activeMatch.to }).run();
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
  tr.replaceWith(from, to, editor.state.schema.text(newText));
  
  const newTo = from + newText.length;
  editor.view.dispatch(tr);
  
  // Re-select using commands
  editor.commands.setTextSelection({ from, to: newTo });
  
  return { from, to: newTo };
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
