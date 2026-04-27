import { initTabs, getTabs, getActiveTab, setActiveTab, closeTab, createNewTab, updateActiveTabContent, markActiveTabSaved, renameActiveTab, ensureCloudNote, removeCloudNote } from './tabs.js';
import { initSidebar, renderTabs } from './sidebar.js';
import { initMenu } from './menu.js';
import { initEditor, setEditorContent, focusEditor, setSearchTerm, setSyntaxLanguage, findNext, findPrev, replaceActive, replaceAll, searchMatches, activeSearchIndex, undo, redo, gotoLine, getCursorPosition } from './editor.js';
import { loadSettings, openSettingsPanel } from './settings.js';
import { openFilePicker, saveFilePicker, saveFileToHandle, verifyPermission, readAsText } from './file-system.js';

import { initStatusBar } from './status-bar.js';
import { initShortcuts } from './shortcuts.js';
import { initFindReplace } from './find-replace.js';
import { initToneSlider, handleSelectionChange } from './tone-slider.js';
import { initPersonaFeedback } from './persona.js';
import { initFirstRun } from './first-run.js';
import { generateAutoName, generateFormat } from './ai-service.js';
import { initI18n, translateDOM } from './i18n.js';
import { initSyncEngine, hasSyncKey, setIsCloudNoteActive, queueSyncSave, forceSyncSave, forceFetch, setSyncStatusCallback } from './sync-engine.js';
// Service worker for PWA
import { registerSW } from 'virtual:pwa-register';
import { createIcons, icons } from 'lucide';
import { marked } from 'marked';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

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
  btnPreview: document.getElementById('btn-toggle-preview'),
  diskWarning: document.getElementById('disk-warning'),
  
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
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: Style.Default });
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Ensure keyboard doesn't mess up our layout completely, maybe Resize mode
      if (Capacitor.getPlatform() === 'android') {
         Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
      }
      
      // Hide PWA install button explicitly
      if (dom.btnInstallPwa) dom.btnInstallPwa.style.display = 'none';
    } catch (e) {
      console.warn('Capacitor init failed:', e);
    }
  }

  // PWA SW
  if ('serviceWorker' in navigator) {
    registerSW();
  }

  // Initialize Internationalization
  await initI18n();

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
      
      if (tab.id === 'cloud-note') {
        const success = await forceSyncSave(tab.content);
        if (success) {
           markActiveTabSaved();
        } else {
           alert('Failed to force sync cloud note. Please check your network.');
        }
        return;
      }
      
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
    onFind: () => {
      if (findCtrl && findCtrl.isOpen()) findCtrl.hide();
      else if (findCtrl) findCtrl.show(false);
    },
    onReplace: () => {
      if (findCtrl && findCtrl.isOpen()) findCtrl.hide();
      else if (findCtrl) findCtrl.show(true);
    },
    onGotoLine: () => {
       const bar = document.getElementById('go-to-line-bar');
       if (!bar.classList.contains('hidden')) {
         bar.classList.add('hidden');
         focusEditor();
       } else {
         bar.classList.remove('hidden');
         document.getElementById('input-goto-line').focus();
       }
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
       findCtrl.hide();
       const aiBubble = document.getElementById('ai-selection-bubble');
       if (aiBubble) aiBubble.classList.remove('visible');
    },
    onOpenSettings: () => {
      dom.tabListView.classList.add('hidden');
      dom.settingsView.classList.remove('hidden');
      openSettingsPanel(dom.settingsContainer);
      if (window.innerWidth > 768) {
        dom.sidebar.dataset.previousWidth = dom.sidebar.style.width || '260px';
        dom.sidebar.style.width = '40vw';
      }
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
    settings: actions.onOpenSettings,
    shortcuts: () => {
       document.getElementById('shortcuts-overlay').classList.remove('hidden');
    }
  });

  dom.btnSettingsBack.addEventListener('click', () => {
    dom.settingsView.classList.add('hidden');
    dom.tabListView.classList.remove('hidden');
    if (dom.sidebar.dataset.previousWidth) {
      dom.sidebar.style.width = dom.sidebar.dataset.previousWidth;
      delete dom.sidebar.dataset.previousWidth;
    }
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

  // Email Document Logic
  const btnEmailDoc = document.getElementById('btn-email-doc');
  if (btnEmailDoc) {
    btnEmailDoc.addEventListener('click', () => {
      const activeTab = getActiveTab();
      if (!activeTab) return;
      
      const subject = encodeURIComponent(activeTab.filename || 'Untitled Document');
      const body = encodeURIComponent(activeTab.content || '');
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    });
  }

  // Go to Line Logic
  const gotoInput = document.getElementById('input-goto-line');
  if (gotoInput) {
    gotoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const line = parseInt(e.target.value, 10);
        document.getElementById('go-to-line-bar').classList.add('hidden');
        if (!isNaN(line)) {
          gotoLine(line);
        } else {
          focusEditor();
        }
        e.target.value = '';
      } else if (e.key === 'Escape') {
        document.getElementById('go-to-line-bar').classList.add('hidden');
        focusEditor();
      }
    });
  }

  // PWA Dynamic Install Prompt Logic has been moved to first-run.js
  initFirstRun();

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
  let isWordWrap = true;
  
  const editorContainer = document.getElementById('editor-container');
  if (editorContainer && isWordWrap) {
    editorContainer.classList.add('word-wrapped');
  }
  
  if (btnToggleWordWrap) {
    if (isWordWrap) btnToggleWordWrap.classList.add('active');
    
    btnToggleWordWrap.addEventListener('click', () => {
      isWordWrap = !isWordWrap;
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
    
    const btnSyncReload = document.getElementById('btn-sync-reload');
    if (btnSyncReload) {
      btnSyncReload.addEventListener('click', async () => {
        await forceFetch(true);
      });
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
  let autonameTimer = null;
  initEditor('editor-root', '', (text) => {
     updateActiveTabContent(text);
     statusBarCtrl.updateStats(text);
     
     const activeTab = getActiveTab();
     if (activeTab && activeTab.id === 'cloud-note') {
       queueSyncSave(text);
     }

     // Auto-Naming Logic
     if (autonameTimer) clearTimeout(autonameTimer);
     if (activeTab && activeTab.filename === 'Untitled.txt' && text.trim().length > 50) {
       autonameTimer = setTimeout(async () => {
         try {
           const data = await generateAutoName(text);
           if (data && data.title && data.emoji) {
             const ext = data.extension ? (data.extension.startsWith('.') ? data.extension : '.' + data.extension) : '.txt';
             const newName = `${data.emoji} ${data.title}${ext}`;
             renameActiveTab(newName);
             if (dom.headerTitle && document.activeElement !== dom.headerTitle) {
               dom.headerTitle.innerText = newName;
             }
           }
         } catch (e) {
           console.error('Autoname failed', e);
         }
       }, 3000);
     }
  }, (text, range, isProgrammatic) => {
    handleSelectionChange(text, range, isProgrammatic);
    const activeTab = getActiveTab();
    if (activeTab) {
      statusBarCtrl.updateStats(activeTab.content, getCursorPosition());
    }
  });

  initToneSlider();
  initPersonaFeedback();

  const btnSmartFormat = document.getElementById('btn-smart-format');
  if (btnSmartFormat) {
    btnSmartFormat.addEventListener('click', async () => {
      const activeTab = getActiveTab();
      if (!activeTab || !activeTab.content || activeTab.content.trim().length < 10) return;
      
      const originalHtml = btnSmartFormat.innerHTML;
      btnSmartFormat.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
      createIcons({ icons, nameAttr: 'data-lucide' });
      
      try {
        const data = await generateFormat(activeTab.content);
        if (data && data.formattedText) {
           setEditorContent(data.formattedText);
           updateActiveTabContent(data.formattedText);
           statusBarCtrl.updateStats(data.formattedText);
        }
      } catch (e) {
        console.error('Smart Format failed', e);
        alert(e.message || 'Smart Format failed');
      } finally {
        btnSmartFormat.innerHTML = originalHtml;
        createIcons({ icons, nameAttr: 'data-lucide' });
      }
    });
  }

  initShortcuts(document.getElementById('shortcuts-overlay'), document.getElementById('shortcuts-container'), actions);

  // Sync Engine init
  await initSyncEngine((remoteContent) => {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.id === 'cloud-note') {
      if (activeTab.content !== remoteContent) {
        updateActiveTabContent(remoteContent);
        setEditorContent(remoteContent);
        statusBarCtrl.updateStats(remoteContent, getCursorPosition());
      }
    } else {
      // Background update if not active
      const cloudTab = getTabs().find(t => t.id === 'cloud-note');
      if (cloudTab) cloudTab.content = remoteContent;
    }
  });

  if (hasSyncKey()) {
    ensureCloudNote();
  }

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
       const btnSyncReload = document.getElementById('btn-sync-reload');
       
       if (active.filename.endsWith('.md') || active.filename.endsWith('.markdown')) {
         dom.btnPreview.style.display = 'block';
       } else {
         dom.btnPreview.style.display = 'none';
         if (isPreviewMode && dom.btnPreview) dom.btnPreview.click();
       }
       
       if (activeTabId === 'cloud-note') {
         setIsCloudNoteActive(true);
         if (btnSyncReload) btnSyncReload.style.display = 'flex';
       } else {
         setIsCloudNoteActive(false);
         if (btnSyncReload) btnSyncReload.style.display = 'none';
       }
       if (dom.diskWarning) {
         const btnDiskSave = document.getElementById('btn-disk-warn-save');
         if (activeTabId === 'cloud-note') {
           dom.diskWarning.classList.remove('hidden');
           if (active.content !== active.savedContent) {
             dom.diskWarning.title = 'Unsaved changes (Cloud Note)';
             btnDiskSave.innerHTML = '<i data-lucide="cloud-off"></i>';
             btnDiskSave.style.color = 'var(--text-secondary)';
           } else {
             dom.diskWarning.title = 'Synced to Cloud';
             btnDiskSave.innerHTML = '<i data-lucide="cloud"></i>';
             btnDiskSave.style.color = 'var(--success)';
           }
           btnDiskSave.classList.remove('danger-icon-btn');
         } else if (!active.fileHandle) {
           dom.diskWarning.classList.remove('hidden');
           dom.diskWarning.title = 'Only saved locally. Click to save to disk.';
           btnDiskSave.innerHTML = '<i data-lucide="save"></i>';
           btnDiskSave.style.color = 'var(--danger)';
           btnDiskSave.classList.add('danger-icon-btn');
         } else {
           dom.diskWarning.classList.add('hidden');
         }
         createIcons({ icons, nameAttr: 'data-lucide' });
       }
    }
    
    if (activeTabId === 'cloud-note') {
      setIsCloudNoteActive(true);
    } else {
      setIsCloudNoteActive(false);
    }
  });

  setSyncStatusCallback((isSyncing, userInitiated) => {
    if (!userInitiated) return;
    
    const btnSyncReload = document.getElementById('btn-sync-reload');
    const cloudIcon = document.querySelector('.tab[data-id="cloud-note"] .cloud-icon');
    
    if (isSyncing) {
      if (btnSyncReload) btnSyncReload.innerHTML = '<i data-lucide="refresh-cw" class="spin"></i>';
      if (cloudIcon) cloudIcon.classList.add('spin');
    } else {
      if (btnSyncReload) btnSyncReload.innerHTML = '<i data-lucide="refresh-cw"></i>';
      if (cloudIcon) cloudIcon.classList.remove('spin');
      
      // Update topnav save state
      const activeTab = getActiveTab();
      if (activeTab && activeTab.id === 'cloud-note') {
        const btnDiskSave = document.getElementById('btn-disk-warn-save');
        if (btnDiskSave && dom.diskWarning) {
          if (activeTab.content !== activeTab.savedContent) {
            dom.diskWarning.title = 'Unsaved changes (Cloud Note)';
            btnDiskSave.innerHTML = '<i data-lucide="cloud-off"></i>';
            btnDiskSave.style.color = 'var(--text-secondary)';
          } else {
            dom.diskWarning.title = 'Synced to Cloud';
            btnDiskSave.innerHTML = '<i data-lucide="cloud"></i>';
            btnDiskSave.style.color = 'var(--success)';
          }
        }
      }
    }
    createIcons({ icons, nameAttr: 'data-lucide' });
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
