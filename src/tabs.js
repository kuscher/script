import { loadTabsState, debouncedSaveTabsState } from './persistence.js';

let tabs = [];
let activeTabId = null;
let changeCallback = null; // called whenever UI needs re-rendering

export async function initTabs(onChange) {
  changeCallback = onChange;
  const hydrated = await loadTabsState();
  if (hydrated && hydrated.length > 0) {
    tabs = hydrated;
    activeTabId = tabs[0].id;
    notify();
    const unsavedCount = tabs.filter(t => t.content !== t.savedContent).length;
    return { restored: true, count: unsavedCount };
  } else {
    const welcomeContent = `# Welcome to Script 👋

Script is a fast, robust, and lightweight plain-text & Markdown editor built with modern Material Expressive principles.

### Key Features
- **Local First:** Your documents are saved natively inside your browser's IndexedDB. No server database required!
- **Markdown Previews:** Hit the eye icon in the top right to hot-swap to rendered Markdown (with full Github-flavored syntax support and injected syntax coloring).
- **Find & Replace:** Seamlessly traverse large codebases directly using native keyboard shortcuts & continuous DOM-based scroll injections.
- **PWA Ready:** Click the install icon in your address bar to snap Script right into your dock, or deploy natively to mobile!
- **AI Assist:** Built-in generative autocomplete specifically context-mapped to your layout.

---

### Open Source
Script is actively built and maintained entirely out in the open! If you want to contribute UI changes, fix a bug, or just explore the architecture, feel free to jump directly into the repository and throw us a Pull Request:

[Improve the project on GitHub](https://github.com/kuscher/script)
`;
    createNewTab(welcomeContent, 'Welcome.md');
    return { restored: false, count: 0 };
  }
}

export function createNewTab(content = '', filename = 'Untitled.txt', handle = null) {
  const id = Date.now().toString();
  const ts = {
    id,
    filename,
    fileHandle: handle,
    content,
    savedContent: content,
    cursorPosition: 0,
    encoding: 'utf-8',
    lineEnding: 'LF' // simplified initial tracking
  };
  tabs.push(ts);
  activeTabId = id;
  notify();
  // Don't auto-save an empty new tab array to idb unnecessarily, but we can.
  debouncedSaveTabsState(tabs);
  return id;
}

export function getTabs() {
  return tabs;
}

export function getActiveTab() {
  return tabs.find(t => t.id === activeTabId);
}

export function setActiveTab(id) {
  activeTabId = id;
  notify();
}

export function updateActiveTabContent(content) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.content = content;
  debouncedSaveTabsState(tabs);
  // We notify to update unsaved dot. Could optimize to only notify if state changes.
  notify(); 
}

export function renameActiveTab(newFilename) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.filename = newFilename;
  debouncedSaveTabsState(tabs);
  notify();
}

export function markActiveTabSaved(newHandle = null, newFilename = null) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.savedContent = tab.content;
  if (newHandle) tab.fileHandle = newHandle;
  if (newFilename) tab.filename = newFilename;
  debouncedSaveTabsState(tabs);
  notify();
}

export function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  
  // if unsaved, caller should have checked. We just close it.
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    // If last tab closed, open a new blank one
    createNewTab();
  } else {
    // Pick another tab
    if (activeTabId === id) {
      const nextIdx = Math.max(0, idx - 1);
      activeTabId = tabs[nextIdx].id;
    }
  }
  debouncedSaveTabsState(tabs);
  notify();
}

function notify() {
  if (changeCallback) changeCallback({ tabs, activeTabId });
}
