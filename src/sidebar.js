import { createIcons, icons } from 'lucide';
import { hasSyncKey } from './sync-engine.js';

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
    const isCloud = tab.id === 'cloud-note';
    const isCloudActive = isCloud && hasSyncKey();
    let iconName = 'file-text';
    if (isCloud) iconName = isCloudActive ? 'cloud' : 'cloud-off';
    else if (isMd) iconName = 'file-code';
    else if (isRtf) iconName = 'file-type';
    
    const div = document.createElement('div');
    div.className = `tab ${isActive ? 'active' : ''} ${isUnsaved && !isCloud ? 'unsaved' : ''}`;
    if (isCloud) {
       div.style.background = isActive ? (isCloudActive ? 'rgba(56, 189, 248, 0.1)' : 'rgba(120, 120, 120, 0.1)') : 'transparent';
       div.style.borderLeft = isActive ? (isCloudActive ? '3px solid #38BDF8' : '3px solid var(--text-placeholder)') : '3px solid transparent';
       if (!isCloudActive) {
         div.style.opacity = '0.7';
       }
    }
    
    div.innerHTML = `
      <i class="tab-icon ${isCloud && isCloudActive ? 'cloud-icon' : ''}" data-lucide="${iconName}" ${isCloud && isCloudActive ? 'style="color:#38BDF8;"' : ''}></i>
      <span class="tab-name" ${isCloud && isCloudActive ? 'style="color:#38BDF8; font-weight:600;"' : ''}>${escapeHtml(tab.filename)}<span class="tab-unsaved"> • unsaved</span></span>
      <button class="tab-close" aria-label="Close" title="Close" style="${isCloud ? 'display:none;' : ''}"><i data-lucide="x"></i></button>
    `;
    
    // Interactions
    div.addEventListener('click', (e) => {
      // if click is on close button, handle close
      if (e.target.closest('.tab-close')) {
        e.stopPropagation();
        actions.onCloseTab(tab.id);
      } else if (isCloud && !isCloudActive) {
        // Redirect to settings to activate sync
        e.stopPropagation();
        if (actions.onOpenSettings) actions.onOpenSettings();
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
