import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { icons, createIcons } from 'lucide';

const aiMentionKey = new PluginKey('ai-mention');

function runGeminiFetch(query, apiKey) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "System prompt: Answer perfectly concisely in 15 words or less. Reply in absolute facts with zero conversational preamble. Do not repeat the subject of the context. Provide only the direct answer.\nQuery: " + query }] }]
    })
  }).then(r => r.json());
}

export const AiMention = Extension.create({
  name: 'aiMention',

  addProseMirrorPlugins() {
    let popoverEl = null;

    return [
      new Plugin({
        key: aiMentionKey,
        state: {
          init: () => ({ active: false, range: null, contextRange: null, contextWords: '', query: '', error: false, isLoading: false }),
          apply(tr, value) {
            const action = tr.getMeta(aiMentionKey);
            if (action) {
              return { ...value, ...action };
            }
            if (tr.docChanged && value.active && value.range) {
              const mappedFrom = tr.mapping.map(value.range.from);
              const mappedTo = tr.mapping.map(value.range.to);
              
              let newContextRange = null;
              if (value.contextRange) {
                newContextRange = {
                  from: tr.mapping.map(value.contextRange.from),
                  to: tr.mapping.map(value.contextRange.to)
                };
              }
              
              if (mappedTo - mappedFrom <= 0) {
                return { active: false, range: null, contextRange: null, contextWords: '', query: '', error: false, isLoading: false };
              }
              const text = tr.doc.textBetween(mappedFrom, mappedTo);
              return { ...value, range: { from: mappedFrom, to: mappedTo }, contextRange: newContextRange, query: text };
            }
            return value;
          }
        },
        view(editorView) {
          popoverEl = document.createElement('div');
          popoverEl.className = 'ai-popover hidden';
          popoverEl.innerHTML = `<i data-lucide="sparkles"></i> <span>Press Enter to ask AI</span>`;
          document.body.appendChild(popoverEl);
          createIcons({ icons, nameAttr: 'data-lucide' });

          return {
            update(view) {
              const state = aiMentionKey.getState(view.state);
              if (state.active && state.range) {
                // Ensure popover tracks the cursor securely 
                const { from } = state.range;
                try {
                  const coords = view.coordsAtPos(from);
                  popoverEl.classList.remove('hidden');
                  popoverEl.style.left = `${coords.left}px`;
                  popoverEl.style.top = `${coords.bottom + 4}px`;
                } catch(e) {}

                if (state.isLoading) {
                   popoverEl.innerHTML = `<i data-lucide="loader"></i> <span>Thinking...</span>`;
                } else if (state.error) {
                   popoverEl.innerHTML = `<i data-lucide="alert-circle" style="color:var(--danger)"></i> <span>${state.error}</span>`;
                } else {
                   popoverEl.innerHTML = `<i data-lucide="sparkles"></i> <span>Press Enter to ask AI</span>`;
                }
                createIcons({ icons, nameAttr: 'data-lucide' });
              } else {
                popoverEl.classList.add('hidden');
              }
            },
            destroy() {
              if (popoverEl) popoverEl.remove();
            }
          };
        },
        props: {
          decorations(state) {
            const extState = aiMentionKey.getState(state);
            if (!extState.active || !extState.range) return DecorationSet.empty;
            const decos = [];
            if (extState.contextRange) {
              decos.push(Decoration.inline(extState.contextRange.from, extState.contextRange.to, {
                class: 'ai-context-active'
              }));
            }
            decos.push(Decoration.inline(extState.range.from, extState.range.to, {
              class: extState.error ? 'ai-query-error' : 'ai-query-active'
            }));
            return DecorationSet.create(state.doc, decos);
          },
          handleKeyDown(view, event) {
            const state = aiMentionKey.getState(view.state);
            
            // Trigger Activation
            if (event.key === '@' && !state.active) {
              const settingsData = localStorage.getItem('script_settings');
              let enabled = false;
              
              if (settingsData) {
                try { enabled = JSON.parse(settingsData).aiMentionEnabled; } catch(e) {}
              }
              
              if (!enabled) return false;
              
              const { $from } = view.state.selection;
              const charBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset);
              
              if (charBefore === '' || charBefore === ' ' || charBefore === '\\n') {
                const textBefore = $from.parent.textBetween(0, $from.parentOffset);
                const wordsMatch = textBefore.match(/\S+/g);
                let contextStartPos = $from.pos;
                let contextQueryStr = '';
                
                if (wordsMatch && wordsMatch.length > 0) {
                  const last6 = wordsMatch.slice(-6);
                  // Fallback match to calculate precise index offset natively
                  const last6escaped = last6.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                  const suffixRegex = new RegExp(last6escaped.join('\\s+') + '\\s*$');
                  const match = textBefore.match(suffixRegex);
                  if (match) {
                     contextStartPos = $from.pos - $from.parentOffset + match.index;
                     contextQueryStr = textBefore.substring(match.index).trim();
                  }
                }

                view.dispatch(view.state.tr.setMeta(aiMentionKey, {
                   active: true, 
                   range: { from: $from.pos, to: $from.pos + 1 },
                   contextRange: contextStartPos < $from.pos ? { from: contextStartPos, to: $from.pos } : null,
                   contextWords: contextQueryStr,
                   query: '@',
                   error: false,
                   isLoading: false
                }).insertText('@'));
                return true;
              }
              return false;
            }

            // Keyboard Handling while Active
            if (state.active) {
              if (event.key === 'Escape') {
                 view.dispatch(view.state.tr.setMeta(aiMentionKey, { active: false, range: null }));
                 return true;
              }
              
              if (event.key === 'Enter') {
                event.preventDefault();
                if (state.isLoading) return true; // block multiple sends
                
                const settingsData = localStorage.getItem('script_settings');
                let apiKey = '';
                if (settingsData) {
                  try { apiKey = JSON.parse(settingsData).aiApiKey; } catch(e) {}
                }
                
                if (!apiKey) {
                   view.dispatch(view.state.tr.setMeta(aiMentionKey, { error: 'API key missing in Settings' }));
                   setTimeout(() => {
                      view.dispatch(view.state.tr.setMeta(aiMentionKey, { active: false, range: null, contextRange: null }));
                   }, 2000);
                   return true;
                }

                const pureQuery = state.query.substring(1).trim(); 
                
                if (pureQuery.length === 0 && (!state.contextWords || state.contextWords.length === 0)) return true;
                
                view.dispatch(view.state.tr.setMeta(aiMentionKey, { isLoading: true }));
                
                const finalPromptQuery = pureQuery ? `${state.contextWords} ${pureQuery}` : state.contextWords;
                
                runGeminiFetch(finalPromptQuery, apiKey)
                  .then(data => {
                     let answer = "Error parsing AI response";
                     if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
                        answer = data.candidates[0].content.parts[0].text.trim();
                     } else if (data.error) {
                        answer = data.error.message || 'API Error';
                     }
                     
                     const finalState = aiMentionKey.getState(view.state);
                     if (finalState.active && finalState.range) {
                        // Atomic History Replacement
                        const tr = view.state.tr.replaceWith(
                          finalState.range.from, 
                          finalState.range.to, 
                          view.state.schema.text(answer)
                        );
                        tr.setMeta(aiMentionKey, { active: false, range: null, contextRange: null });
                        view.dispatch(tr);
                     }
                  })
                  .catch(err => {
                     let finalState = aiMentionKey.getState(view.state);
                     if (finalState.active && finalState.range) {
                        const ogQuery = finalState.query; 
                        
                        let tr = view.state.tr.replaceWith(
                          finalState.range.from,
                          finalState.range.to,
                          view.state.schema.text("AI unavailable")
                        );
                        
                        const newTo = finalState.range.from + "AI unavailable".length;
                        tr.setMeta(aiMentionKey, { 
                          active: true, 
                          range: {from: finalState.range.from, to: newTo}, 
                          contextRange: finalState.contextRange,
                          isLoading: false, 
                          error: 'Network failure' 
                        });
                        view.dispatch(tr);
                        
                        // Bounce back loop natively reverses the failure after 2 seconds
                        setTimeout(() => {
                           let revertState = aiMentionKey.getState(view.state);
                           if (revertState.active && revertState.error && revertState.range) {
                             let rTr = view.state.tr.replaceWith(
                               revertState.range.from,
                               revertState.range.to,
                               view.state.schema.text(ogQuery)
                             );
                             rTr.setMeta(aiMentionKey, { active: false, range: null, contextRange: null, error: false });
                             view.dispatch(rTr);
                           }
                        }, 2000);
                     }
                  });
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  }
});
