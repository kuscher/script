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

let currentSearchTerm = '';
const searchPlugin = new Plugin({
  key: new PluginKey('search'),
  state: {
    init() { return DecorationSet.empty; },
    apply(tr) {
      if (!currentSearchTerm) return DecorationSet.empty;
      const decorations = [];
      const regex = new RegExp(`(${currentSearchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
      tr.doc.descendants((node, pos) => {
        if (node.isText) {
          const text = node.text;
          let match;
          while ((match = regex.exec(text)) !== null) {
            decorations.push(
              Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                class: 'search-highlight'
              })
            );
          }
        }
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

export function initEditor(containerId, initialContent, onChange) {
  updateCallback = onChange;
  updateCallback = onChange;
  const container = document.getElementById(containerId);
  if (!container) return;
  
  editor = new Editor({
    element: container,
    extensions: [
      Document,
      History,
      Paragraph,
      Text,
      SearchHighlight,
      SyntaxHighlight,
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
      // Could notify cursor position changes
      // let pos = editor.state.selection.$head;
      // notifyCursor(pos.line, pos.col); // pseudo code
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

export function focusEditor() {
  if (editor) editor.commands.focus();
}

export function setSearchTerm(term) {
  if (currentSearchTerm === term) return;
  currentSearchTerm = term;
  if (editor) {
    editor.view.dispatch(editor.state.tr.setMeta('search', true));
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
