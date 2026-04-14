import { initTabs, getTabs, getActiveTab, setActiveTab, closeTab, createNewTab, updateActiveTabContent, markActiveTabSaved, renameActiveTab } from './tabs.js';
import { initSidebar, renderTabs, renderRecents } from './sidebar.js';
import { initMenu } from './menu.js';
import { initEditor, setEditorContent, focusEditor, setSearchTerm, setSyntaxLanguage } from './editor.js';
import { loadSettings, openSettingsPanel } from './settings.js';
import { openFilePicker, saveFilePicker, saveFileToHandle, verifyPermission } from './file-system.js';
import { initRecents, addRecent, getRecents, handleRecentClick } from './recent-files.js';
import { initStatusBar } from './status-bar.js';
import { initShortcuts } from './shortcuts.js';
import { initFindReplace } from './find-replace.js';
// Service worker for PWA
import { registerSW } from 'virtual:pwa-register';
import { createIcons, icons } from 'lucide';
import { marked } from 'marked';

const dom = {
  sidebar: document.getElementById('sidebar'),
  hamburger: document.getElementById('btn-hamburger'),
  tabListView: document.getElementById('sidebar-tabs-view'),
  settingsView: document.getElementById('sidebar-settings-view'),
  tabsContainer: document.getElementById('tab-list'),
  recentsContainer: document.getElementById('recent-list'),
  menuEl: document.getElementById('overflow-menu'),
  
  // Sidebar actions
  btnMenu: document.getElementById('btn-menu'),
  btnOpen: document.getElementById('btn-open-file'),
  btnSave: document.getElementById('btn-save-file'),
  btnNew: document.getElementById('btn-new-tab'),
  
  // Settings
  btnSettingsBack: document.getElementById('btn-settings-back'),
  settingsContainer: document.getElementById('settings-container'),

  // Search
  findBar: document.getElementById('find-bar'),
  
  // Header details
  headerTitle: document.getElementById('header-title'),
  headerIcon: document.getElementById('header-file-icon'),
  
  // Status Bar
  statusBars: {
    encoding: document.getElementById('stat-encoding'),
    lineEnding: document.getElementById('stat-line-ending'),
    cursor: document.getElementById('stat-cursor'),
    words: document.getElementById('stat-words'),
    filetype: document.getElementById('stat-filetype'),
    picker: document.getElementById('encoding-picker')
  }
};

let statusBarCtrl;

async function bootstrap() {
  // PWA SW
  if ('serviceWorker' in navigator) {
    registerSW();
  }

  // Settings
  loadSettings((sett) => {
    // on settings changed
  });

  // UI Setup
  statusBarCtrl = initStatusBar(dom.statusBars);
  const findCtrl = initFindReplace('find-bar');

  // Actions map
  const actions = {
    onSelectTab: (id) => setActiveTab(id),
    onCloseTab: (id) => closeTab(id),
    onNewTab: () => createNewTab(),
    onOpen: async () => {
      const res = await openFilePicker();
      if (res) {
        const id = createNewTab(res.content, res.file.name, res.handle);
        addRecent(res.file.name, res.handle);
      }
    },
    onToggleMenu: () => {},
    onSave: async () => {
      const tab = getActiveTab();
      if (!tab) return;
      if (tab.fileHandle) {
        const hasPerms = await verifyPermission(tab.fileHandle, true);
        if (!hasPerms) return; // user discarded permission prompt
        await saveFileToHandle(tab.fileHandle, tab.content);
        markActiveTabSaved();
      } else {
        const handle = await saveFilePicker(tab.content, tab.filename);
        if (handle) markActiveTabSaved(handle, handle.name);
      }
    },
    onSaveAs: async () => {
      const tab = getActiveTab();
      if (!tab) return;
      const handle = await saveFilePicker(tab.content, tab.filename);
      if (handle) markActiveTabSaved(handle, handle.name);
    },
    onPrint: () => window.print(),
    onFind: () => findCtrl.show(false),
    onReplace: () => findCtrl.show(true),
    onGotoLine: () => {
       const bar = document.getElementById('go-to-line-bar');
       bar.classList.remove('hidden');
       document.getElementById('input-goto-line').focus();
    },
    onToggleSidebar: () => {
       dom.sidebar.classList.toggle('collapsed');
    },
    onEscape: () => {
       document.getElementById('go-to-line-bar').classList.add('hidden');
    }
  };

  // Additional Menu explicit binds
  initMenu(dom.menuEl, dom.btnMenu, {
    new: actions.onNewTab,
    open: actions.onOpen,
    save: actions.onSave,
    saveAs: actions.onSaveAs,
    print: actions.onPrint,
    find: actions.onFind,
    goTo: actions.onGotoLine,
    settings: () => {
      dom.tabListView.classList.add('hidden');
      dom.settingsView.classList.remove('hidden');
      openSettingsPanel(dom.settingsContainer);
    },
    shortcuts: () => {
       document.getElementById('shortcuts-overlay').classList.remove('hidden');
    }
  });

  dom.btnSettingsBack.addEventListener('click', () => {
    dom.settingsView.classList.add('hidden');
    dom.tabListView.classList.remove('hidden');
  });

  dom.hamburger.addEventListener('click', actions.onToggleSidebar);
  
  const btnDiskWarn = document.getElementById('btn-disk-warn-save');
  if (btnDiskWarn) {
    btnDiskWarn.addEventListener('click', actions.onSave);
  }

  // Init Data logic
  initSidebar(dom, actions);
  
  initRecents((rec) => renderRecents(rec, dom.recentsContainer));

  // Editable Header Title Logic
  if (dom.headerTitle) {
    dom.headerTitle.addEventListener('blur', (e) => {
      const newName = e.target.innerText.trim() || 'Untitled.txt';
      renameActiveTab(newName);
    });
    dom.headerTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dom.headerTitle.blur();
      }
    });
  }

  // Markdown Preview Toggle Logic
  const btnTogglePreview = document.getElementById('btn-toggle-preview');
  let isPreviewMode = false;

  if (btnTogglePreview) {
    btnTogglePreview.addEventListener('click', () => {
      isPreviewMode = !isPreviewMode;
      const activeTab = getActiveTab();
      if (!activeTab) return;
      const previewContainer = document.getElementById('markdown-preview');
      const editorRoot = document.getElementById('editor-root');
      const lineNumbers = document.getElementById('line-numbers');
      
      if (isPreviewMode) {
        previewContainer.innerHTML = marked.parse(activeTab.content || '');
        previewContainer.classList.remove('hidden');
        editorRoot.classList.add('hidden');
        lineNumbers.classList.add('hidden');
        btnTogglePreview.innerHTML = '<i data-lucide="eye-off"></i>';
      } else {
        previewContainer.classList.add('hidden');
        editorRoot.classList.remove('hidden');
        lineNumbers.classList.remove('hidden');
        btnTogglePreview.innerHTML = '<i data-lucide="eye"></i>';
      }
      createIcons({ icons, nameAttr: 'data-lucide' });
    });
  }

  const findInput = document.getElementById('find-input');
  if (findInput) {
    findInput.addEventListener('input', (e) => {
      setSearchTerm(e.target.value);
    });
  }

  // Editor wireup
  initEditor('editor-root', '', (text) => {
     updateActiveTabContent(text);
     statusBarCtrl.updateStats(text);
  });

  initShortcuts(document.getElementById('shortcuts-overlay'), document.getElementById('shortcuts-container'), actions);

  // Tabs start
  const state = await initTabs(({ tabs, activeTabId }) => {
    renderTabs(tabs, activeTabId, dom.tabsContainer);
    const active = tabs.find(t => t.id === activeTabId);
    if (active) {
       setEditorContent(active.content);
       statusBarCtrl.updateFormat(active.filename);
       statusBarCtrl.updateStats(active.content);
       if (dom.headerTitle && document.activeElement !== dom.headerTitle) {
         dom.headerTitle.innerText = active.filename;
       }
       setSyntaxLanguage(active.filename);
       if (dom.headerIcon) {
         let iconName = 'file-text';
         if (active.filename.endsWith('.md')) iconName = 'file-code';
         else if (active.filename.endsWith('.rtf')) iconName = 'file-type';
         dom.headerIcon.setAttribute('data-lucide', iconName);
       }
       if (active.filename.endsWith('.md') || active.filename.endsWith('.markdown')) {
          if (btnTogglePreview) btnTogglePreview.style.display = 'flex';
       } else {
          if (btnTogglePreview) btnTogglePreview.style.display = 'none';
          if (isPreviewMode && btnTogglePreview) btnTogglePreview.click();
       }
       
       const diskWarning = document.getElementById('disk-warning');
       if (diskWarning) {
         if (!active.fileHandle) {
           diskWarning.classList.remove('hidden');
         } else {
           diskWarning.classList.add('hidden');
         }
       }
    }
  });

  if (state.restored && state.count > 0) {
    const banner = document.getElementById('recovery-banner');
    document.getElementById('recovery-text').innerText = `Restored ${state.count} unsaved file(s) from your last session.`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 5000);
  }
  
  document.getElementById('btn-close-recovery').addEventListener('click', () => {
      document.getElementById('recovery-banner').classList.add('hidden');
  });

  createIcons({ 
    icons,
    nameAttr: 'data-lucide' 
  });
}

// Start
document.addEventListener('DOMContentLoaded', bootstrap);
