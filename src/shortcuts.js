export function initShortcuts(overlayEl, container, actions) {
  const map = [
    { cat: 'File', key: 'Ctrl+N', label: 'New file', action: actions.onNew },
    { cat: 'File', key: 'Ctrl+O', label: 'Open file', action: actions.onOpen },
    { cat: 'File', key: 'Ctrl+S', label: 'Save', action: actions.onSave },
    { cat: 'File', key: 'Ctrl+Shift+S', label: 'Save As', action: actions.onSaveAs },
    { cat: 'File', key: 'Ctrl+P', label: 'Print', action: actions.onPrint },
    { cat: 'File', key: 'Ctrl+W', label: 'Close tab', action: actions.onCloseTab },
    { cat: 'View', key: 'Ctrl+B', label: 'Toggle sidebar', action: actions.onToggleSidebar },
    { cat: 'Search', key: 'Ctrl+F', label: 'Find', action: actions.onFind },
    { cat: 'Search', key: 'Ctrl+H', label: 'Find & Replace', action: actions.onReplace },
    { cat: 'Navigation', key: 'Ctrl+G', label: 'Go to line', action: actions.onGotoLine },
    { cat: 'Help', key: 'Ctrl+/', label: 'Keyboard shortcuts', action: () => showOverlay(overlayEl) },
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
    html += `<h3>${cat}</h3>`;
    groups[cat].forEach(m => {
      html += `<div class="shortcut-row"><span>${m.label}</span><kbd class="kbd-key">${m.key}</kbd></div>`;
    });
    html += '<hr style="border:0; border-top:1px solid var(--border-hairline); margin:16px 0;">';
  }
  container.innerHTML = html;

  // Global listener
  document.addEventListener('keydown', (e) => {
    // Escape
    if (e.key === 'Escape') {
      if (!overlayEl.classList.contains('hidden')) {
        overlayEl.classList.add('hidden');
        return;
      }
      if (actions.onEscape) actions.onEscape();
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    let shortcutStr = 'Ctrl+';
    if (e.shiftKey) shortcutStr += 'Shift+';
    
    // Normalize key
    if (e.key === '/') shortcutStr += '/';
    else if (e.code && e.code.startsWith('Key')) shortcutStr += e.code.replace('Key', '');
    else return;

    const matched = map.find(m => m.key === shortcutStr);
    if (matched && matched.action) {
      e.preventDefault(); // Prevent browser default (e.g. Ctrl S opening save dialog)
      matched.action();
    }
  });

  document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
    overlayEl.classList.add('hidden');
  });
}

function showOverlay(el) {
  el.classList.remove('hidden');
}
