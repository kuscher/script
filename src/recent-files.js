import { loadRecents, saveRecents } from './persistence.js';
import { verifyPermission } from './file-system.js';

let recents = [];
let renderCallback = null;

export async function initRecents(onRender) {
  renderCallback = onRender;
  recents = await loadRecents();
  render();
}

/**
 * Shape of recent: { filename, handle }
 * Handle may need permission verification upon use.
 */
export async function addRecent(filename, handle) {
  if (!handle) return;
  // Remove if exists
  recents = recents.filter(r => r.filename !== filename);
  // Add to top
  recents.unshift({ filename, handle });
  // Keep last 5
  if (recents.length > 5) recents.pop();
  
  await saveRecents(recents);
  render();
}

export function getRecents() {
  return recents;
}

export async function handleRecentClick(index, onOpen) {
  const item = recents[index];
  if (!item) return;

  const hasPerm = await verifyPermission(item.handle, true);
  if (!hasPerm) {
    alert('Permission to access file was denied or expired.');
    // remove from recents?
    recents.splice(index, 1);
    saveRecents(recents);
    render();
    return;
  }
  
  const file = await item.handle.getFile();
  onOpen(item.handle, file);
}

function render() {
  if (renderCallback) renderCallback(recents);
}
