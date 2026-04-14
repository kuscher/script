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
    createNewTab();
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
