import { initTabs, getTabs, getActiveTab, setActiveTab, closeTab, createNewTab, updateActiveTabContent, markActiveTabSaved, renameActiveTab } from './tabs.js';
import { initSidebar, renderTabs } from './sidebar.js';
import { initMenu } from './menu.js';
import { initEditor, setEditorContent, focusEditor, setSearchTerm, setSyntaxLanguage, findNext, findPrev, replaceActive, replaceAll, searchMatches, activeSearchIndex, undo, redo } from './editor.js';
import { loadSettings, openSettingsPanel } from './settings.js';
import { openFilePicker, saveFilePicker, saveFileToHandle, verifyPermission, readAsText } from './file-system.js';

import { initStatusBar } from './status-bar.js';
import { initShortcuts } from './shortcuts.js';
import { initFindReplace } from './find-replace.js';
import { initToneSlider, handleSelectionChange } from './tone-slider.js';
import { initPersonaFeedback } from './persona.js';
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

  // Default collapse sidebar on narrow screens
  if (window.innerWidth <= 768 && dom.sidebar) {
    dom.sidebar.classList.add('collapsed');
  }

  // Settings
  loadSettings((sett) => {
    // on settings changed
  });

  // UI Setup
  statusBarCtrl = initStatusBar(dom.statusBars);
  const findCtrl = initFindReplace('find-bubble-overlay');

  // Actions map
  const actions = {
    onSelectTab: (id) => setActiveTab(id),
    onCloseTab: (id) => closeTab(id),
    onNewTab: () => createNewTab(),
    onOpen: async () => {
      const res = await openFilePicker();
      if (res) {
        const id = createNewTab(res.content, res.file.name, res.handle);
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
       const overlay = document.getElementById('mobile-sidebar-overlay');
       if (overlay) {
         if (dom.sidebar.classList.contains('collapsed')) {
           overlay.classList.add('hidden');
         } else {
           overlay.classList.remove('hidden');
         }
       }
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
  
  const mobileOverlay = document.getElementById('mobile-sidebar-overlay');
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
      dom.sidebar.classList.add('collapsed');
      mobileOverlay.classList.add('hidden');
    });
  }
  
  const btnDiskWarn = document.getElementById('btn-disk-warn-save');
  if (btnDiskWarn) {
    btnDiskWarn.addEventListener('click', actions.onSave);
  }

  // Find Bubble Toggle Logic
  const btnFindToggle = document.getElementById('btn-find-toggle');
  const findBubbleOverlay = document.getElementById('find-bubble-overlay');
  if (btnFindToggle && findBubbleOverlay) {
    btnFindToggle.addEventListener('click', () => {
      const isHidden = findBubbleOverlay.classList.contains('hidden');
      if (isHidden) {
        findBubbleOverlay.classList.remove('hidden');
        findBubbleOverlay.classList.add('visible');
        actions.onFind();
      } else {
        findBubbleOverlay.classList.add('hidden');
        findBubbleOverlay.classList.remove('visible');
      }
    });
  }

  // Init Data logic
  initSidebar(dom, actions);
  
  // First Run
  const firstRunSaved = localStorage.getItem('script_first_run');
  const firstRunDialog = document.getElementById('first-run-dialog');
  if (!firstRunSaved && firstRunDialog) {
    firstRunDialog.showModal();
    document.getElementById('btn-first-run-submit').addEventListener('click', () => {
      const apiKey = document.getElementById('first-run-api-key').value.trim();
      localStorage.setItem('script_first_run', 'true');
      if (apiKey) {
        localStorage.setItem('script_settings', JSON.stringify({ aiMentionEnabled: true, aiApiKey: apiKey }));
      }
      firstRunDialog.close();
    });
    document.getElementById('btn-first-run-skip').addEventListener('click', () => {
      localStorage.setItem('script_first_run', 'true');
      firstRunDialog.close();
    });
  }

  // Sidebar Resizer Logic
  const resizer = document.getElementById('sidebar-resizer');
  const sidebar = document.getElementById('sidebar');
  let isResizing = false;

  if (resizer && sidebar) {
    const savedWidth = localStorage.getItem('script_sidebar_width');
    if (savedWidth && sidebar.style.width !== '0px') {
      sidebar.style.width = savedWidth + 'px';
    }

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      sidebar.classList.add('is-resizing');
      resizer.classList.add('is-resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 700) newWidth = 700;
      sidebar.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        sidebar.classList.remove('is-resizing');
        resizer.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('script_sidebar_width', sidebar.offsetWidth);
      }
    });
  }

  // PWA Dynamic Install Prompt Logic
  let deferredPrompt;
  const btnInstallPwa = document.getElementById('btn-install-pwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile natively
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    if (btnInstallPwa) {
      btnInstallPwa.classList.remove('hidden');
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      // Show the native install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        btnInstallPwa.classList.add('hidden'); // Hide button if installed successfully
      }
      // Clear the saved prompt since it can't be used again
      deferredPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (btnInstallPwa) btnInstallPwa.classList.hidden = true;
    deferredPrompt = null;
  });

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
        previewContainer.classList.remove('hidden');
        editorRoot.classList.add('hidden');
        lineNumbers.classList.add('hidden');
        btnTogglePreview.innerHTML = '<i data-lucide="eye-off"></i>';
        refreshMarkdownPreview();
      } else {
        previewContainer.classList.add('hidden');
        editorRoot.classList.remove('hidden');
        lineNumbers.classList.remove('hidden');
        btnTogglePreview.innerHTML = '<i data-lucide="eye"></i>';
      }
      createIcons({ icons, nameAttr: 'data-lucide' });
    });
  }

  // Word Wrap Toggle Logic
  const btnToggleWordWrap = document.getElementById('btn-toggle-word-wrap');
  let isWordWrap = false;
  
  if (btnToggleWordWrap) {
    btnToggleWordWrap.addEventListener('click', () => {
      isWordWrap = !isWordWrap;
      const editorContainer = document.getElementById('editor-container');
      if (isWordWrap) {
        editorContainer.classList.add('word-wrapped');
        btnToggleWordWrap.classList.add('active');
      } else {
        editorContainer.classList.remove('word-wrapped');
        btnToggleWordWrap.classList.remove('active');
      }
    });
  }

  const findInput = document.getElementById('find-input');
  const findCount = document.getElementById('find-count');
  
  function refreshMarkdownPreview() {
     const previewContainer = document.getElementById('markdown-preview');
     if (!previewContainer || previewContainer.classList.contains('hidden')) return;
     const activeTab = getActiveTab();
     if (!activeTab) return;
     
     let html = marked.parse(activeTab.content || '');
     if (findInput && findInput.value) {
        let matchCount = 0;
        const regex = new RegExp(`(${findInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
        html = html.replace(regex, (match) => {
           let cls = 'search-highlight';
           // Match internal ProseMirror active indexing natively
           if (matchCount === activeSearchIndex) {
               cls += ' search-match-active';
           }
           matchCount++;
           return `<span class="${cls}">${match}</span>`;
        });
     }
     previewContainer.innerHTML = html;
     
     // Try to scroll precisely over the active map if rendering overrides it dynamically
     setTimeout(() => {
        const activeNode = previewContainer.querySelector('.search-match-active');
        if (activeNode) {
           activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
     }, 50);
  }
  
  function updateFindCount() {
     if (!findInput || !findInput.value) {
       if(findCount) findCount.innerText = '';
       refreshMarkdownPreview();
       return;
     }
     if (searchMatches.length === 0) {
       if(findCount) findCount.innerText = '0/0';
     } else {
       if(findCount) findCount.innerText = `${activeSearchIndex + 1}/${searchMatches.length}`;
     }
     refreshMarkdownPreview();
  }

  if (findInput) {
    findInput.addEventListener('input', (e) => {
      setSearchTerm(e.target.value);
      updateFindCount();
    });
    
    findInput.addEventListener('keydown', (e) => {
       if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) findPrev();
          else findNext();
          updateFindCount();
       } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          findPrev();
          updateFindCount();
       } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          findNext();
          updateFindCount();
       } else if (e.key === 'Escape') {
          // Clear find
          setSearchTerm('');
          findInput.value = '';
          updateFindCount();
          focusEditor();
       }
    });

    const btnNext = document.getElementById('btn-find-next');
    if (btnNext) {
      btnNext.addEventListener('mousedown', e => e.preventDefault());
      btnNext.addEventListener('click', () => { findNext(); updateFindCount(); });
    }
    
    const btnPrev = document.getElementById('btn-find-prev');
    if (btnPrev) {
      btnPrev.addEventListener('mousedown', e => e.preventDefault());
      btnPrev.addEventListener('click', () => { findPrev(); updateFindCount(); });
    }
    
    const btnToggleReplace = document.getElementById('btn-toggle-replace');
    if (btnToggleReplace) {
      btnToggleReplace.addEventListener('mousedown', e => e.preventDefault());
    }
    
    document.getElementById('btn-undo')?.addEventListener('click', () => { undo(); focusEditor(); });
    document.getElementById('btn-redo')?.addEventListener('click', () => { redo(); focusEditor(); });

    const btnReplace = document.getElementById('btn-replace');
    const replaceInput = document.getElementById('replace-input');
    if (btnReplace && replaceInput) {
       btnReplace.addEventListener('mousedown', e => e.preventDefault());
       btnReplace.addEventListener('click', () => {
          replaceActive(replaceInput.value);
          // Modifying doc re-runs search automatically, just update count
          setTimeout(updateFindCount, 10);
       });
       replaceInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
             e.preventDefault();
             replaceActive(replaceInput.value);
             setTimeout(updateFindCount, 10);
          }
       });
    }
    
    const btnReplaceAll = document.getElementById('btn-replace-all');
    if (btnReplaceAll && replaceInput) {
       btnReplaceAll.addEventListener('mousedown', e => e.preventDefault());
       btnReplaceAll.addEventListener('click', () => {
          replaceAll(replaceInput.value);
          setTimeout(updateFindCount, 10);
       });
    }
  }

  // Editor wireup
  initEditor('editor-root', '', (text) => {
     updateActiveTabContent(text);
     statusBarCtrl.updateStats(text);
  }, handleSelectionChange);

  initToneSlider();
  initPersonaFeedback();

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

  // Launch Queue API for File Handling
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || !launchParams.files.length) return;
      
      for (const handle of launchParams.files) {
        try {
          const file = await handle.getFile();
          const content = await readAsText(file);
          createNewTab(content, file.name, handle);
        } catch (e) {
          console.error('Failed to open file from launchQueue', e);
        }
      }
    });
  }

  // Workspace background grid spotlight effect
  const mainWorkspace = document.getElementById('main-workspace');
  const hoverGrid = document.getElementById('hover-grid');
  const baseGrid = document.querySelector('.base-grid');
  if (mainWorkspace && hoverGrid && baseGrid) {
    mainWorkspace.addEventListener('mousemove', (e) => {
      // Store globally for AI bubble positioning
      window.lastMouseX = e.clientX;
      window.lastMouseY = e.clientY;
      
      const rect = mainWorkspace.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      hoverGrid.style.setProperty('--mouse-x', `${x}px`);
      hoverGrid.style.setProperty('--mouse-y', `${y}px`);
      baseGrid.style.setProperty('--mouse-x', `${x}px`);
      baseGrid.style.setProperty('--mouse-y', `${y}px`);
    });
  }
}

// Start
document.addEventListener('DOMContentLoaded', bootstrap);
