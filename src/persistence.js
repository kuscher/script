import { get, set } from 'idb-keyval';

const TABS_KEY = 'drift_tabs_state';
const RECENTS_KEY = 'drift_recent_files';

/**
 * Tabs array persistence.
 * Shape: [{ id, filename, fileHandle, content, savedContent, cursorPosition, scrollPosition, encoding }]
 */

export async function loadTabsState() {
  const state = await get(TABS_KEY);
  return state || [];
}

export async function saveTabsState(tabs) {
  await set(TABS_KEY, tabs);
}

// Debounce helper for tabs saving
let timeout;
export function debouncedSaveTabsState(tabs, ms = 1000) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    saveTabsState(tabs);
  }, ms);
}

// Recents persistence
export async function loadRecents() {
  const state = await get(RECENTS_KEY);
  return state || [];
}

export async function saveRecents(recents) {
  await set(RECENTS_KEY, recents);
}
