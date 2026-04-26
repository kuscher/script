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
- **Auto-Naming AI:** Just brain dump in an Untitled document. After a short pause, the AI will automatically name it, pick an emoji, and assign the correct file extension.
- **Smart Format (Markdownifier):** Click the magic wand (✨) in the top right to instantly turn any unstructured wall of text into perfectly structured, bulleted, and bolded Markdown.
- **Adjust Tone & Ghostwriter:** Highlight text to adjust its tone on a slider from blunt to diplomatic, or use the floating action bubble to smart-copy.
- **Kuscher Judgement:** Need brutal, honest feedback? The AI Persona bubble is always watching.

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
  if (tab.content === content) return;

  const wasUnsaved = tab.content !== tab.savedContent;
  tab.content = content;
  debouncedSaveTabsState(tabs);
  
  const isUnsaved = tab.content !== tab.savedContent;
  if (wasUnsaved !== isUnsaved) {
    notify(); 
  }
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

export function ensureCloudNote() {
  const existing = tabs.find(t => t.id === 'cloud-note');
  if (!existing) {
    tabs.unshift({
      id: 'cloud-note',
      filename: 'Cloud Note',
      fileHandle: null,
      content: '',
      savedContent: '',
      cursorPosition: 0,
      encoding: 'utf-8',
      lineEnding: 'LF'
    });
    debouncedSaveTabsState(tabs);
    notify();
  }
}

export function removeCloudNote() {
  const idx = tabs.findIndex(t => t.id === 'cloud-note');
  if (idx !== -1) {
    if (activeTabId === 'cloud-note') {
      const nextTab = tabs.find(t => t.id !== 'cloud-note');
      activeTabId = nextTab ? nextTab.id : null;
    }
    tabs.splice(idx, 1);
    if (tabs.length === 0) createNewTab();
    else {
      debouncedSaveTabsState(tabs);
      notify();
    }
  }
}
