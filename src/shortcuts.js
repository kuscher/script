export const isMac = navigator.userAgent.includes('Mac OS X');

export function initShortcuts(overlayEl, container, actions) {
  const map = [
    { cat: 'File', key: 'Mod+N', label: 'New file', action: actions.onNewTab },
    { cat: 'File', key: 'Mod+O', label: 'Open file', action: actions.onOpen },
    { cat: 'File', key: 'Mod+S', label: 'Save', action: actions.onSave },
    { cat: 'File', key: 'Mod+Shift+S', label: 'Save As', action: actions.onSaveAs },
    { cat: 'File', key: 'Mod+P', label: 'Print', action: actions.onPrint },
    { cat: 'File', key: 'Mod+W', label: 'Close tab', action: actions.onCloseTab },
    { cat: 'View', key: 'Mod+B', label: 'Toggle sidebar', action: actions.onToggleSidebar },
    { cat: 'Search', key: 'Mod+F', label: 'Find', action: actions.onFind },
    { cat: 'Search', key: 'Mod+H', label: 'Find & Replace', action: actions.onReplace },
    { cat: 'Navigation', key: 'Mod+G', label: 'Go to line', action: actions.onGotoLine },
    { cat: 'Help', key: 'Mod+/', label: 'Keyboard shortcuts', action: () => showOverlay(overlayEl) },
    { cat: 'System', key: 'Escape', label: 'Dismiss panels', action: actions.onEscape }
  ];

  // Render to container
  const groups = {};
  map.forEach(m => {
    if (!groups[m.cat]) groups[m.cat] = [];
    groups[m.cat].push(m);
  });

  let html = '';
  for (let cat in groups) {
    html += `<h3 data-i18n="shortcuts.category_${cat.toLowerCase()}">${cat}</h3>`;
    groups[cat].forEach(m => {
      // Display 'Cmd' or '⌘' on Mac, 'Ctrl' otherwise
      let displayKey = m.key;
      if (isMac) {
        displayKey = displayKey.replace('Mod+', '⌘');
        displayKey = displayKey.replace('Shift+', '⇧');
      } else {
        displayKey = displayKey.replace('Mod+', 'Ctrl+');
      }
      
      const i18nLabelKey = `shortcuts.label_${m.label.replace(/\s+/g, '_').toLowerCase()}`;
      html += `<div class="shortcut-row"><span data-i18n="${i18nLabelKey}">${m.label}</span><kbd class="kbd-key">${displayKey}</kbd></div>`;
    });
    html += '<hr style="border:0; border-top:1px solid var(--border-hairline); margin:16px 0;">';
  }
  container.innerHTML = html;

  // Global listener
  document.addEventListener('keydown', (e) => {
    // Dismiss things with Escape
    if (e.key === 'Escape') {
      if (!overlayEl.classList.contains('hidden')) {
        overlayEl.classList.add('hidden');
        return;
      }
      if (actions.onEscape) actions.onEscape();
      return;
    }

    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod && e.key !== 'Escape') return;

    let shortcutStr = 'Mod+';
    if (e.shiftKey) shortcutStr += 'Shift+';
    
    // Normalize key
    const key = e.key.toUpperCase();
    if (key === '/') shortcutStr += '/';
    else if (key.length === 1 && key >= 'A' && key <= 'Z') shortcutStr += key;
    else return;

    const matched = map.find(m => m.key.toUpperCase() === shortcutStr);
    if (matched && matched.action) {
      e.preventDefault();
      matched.action();
    }
  });

  document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
    overlayEl.classList.add('hidden');
  });
}

export function showOverlay(el) {
  el.classList.remove('hidden');
}
