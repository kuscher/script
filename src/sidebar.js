import { createIcons, icons } from 'lucide';

let actions = {};

export function initSidebar(domElements, callbacks) {
  actions = callbacks;
  const { btnMenu, btnOpen, btnSave, btnNew, tabListContainer } = domElements;
  
  btnNew.addEventListener('click', () => actions.onNewTab());
  btnOpen.addEventListener('click', () => actions.onOpen());
  btnSave.addEventListener('click', () => actions.onSave());
  btnMenu.addEventListener('click', () => actions.onToggleMenu());
  
  // Lucide icons init happens globally, but we might need to recall it after rendering.
}

export function renderTabs(tabs, activeTabId, container) {
  container.innerHTML = '';
  tabs.forEach(tab => {
    const isUnsaved = tab.content !== tab.savedContent;
    const isActive = tab.id === activeTabId;
    
    // File type icon
    const isMd = tab.filename.endsWith('.md');
    const isRtf = tab.filename.endsWith('.rtf');
    let iconName = 'file-text';
    if (isMd) iconName = 'file-code';
    if (isRtf) iconName = 'file-type';
    
    const div = document.createElement('div');
    div.className = `tab ${isActive ? 'active' : ''} ${isUnsaved ? 'unsaved' : ''}`;
    div.innerHTML = `
      <i class="tab-icon" data-lucide="${iconName}"></i>
      <span class="tab-name">${escapeHtml(tab.filename)}<span class="tab-unsaved"> • unsaved</span></span>
      <button class="tab-close" aria-label="Close" title="Close"><i data-lucide="x"></i></button>
    `;
    
    // Interactions
    div.addEventListener('click', (e) => {
      // if click is on close button, handle close
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        actions.onCloseTab(tab.id);
      } else {
        actions.onSelectTab(tab.id);
      }
    });

    container.appendChild(div);
  });
  
  createIcons({ 
    icons,
    nameAttr: 'data-lucide' 
  });
}

export function renderRecents(recents, container) {
  container.innerHTML = '';
  recents.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.innerHTML = `<span class="tab-name">${escapeHtml(item.filename)}</span>`;
    div.addEventListener('click', () => actions.onOpenRecent(index));
    container.appendChild(div);
  });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
