/**
 * Sync Engine for Script
 * Handles real-time syncing of the Cloud Note to Vercel KV using the Sync Key
 */

import { ensureCloudNote, removeCloudNote } from './tabs.js';

let syncKey = null;
let isCloudNoteActive = false;
let syncTimer = null;
let pollTimer = null;
let isSyncing = false;
let lastSyncedContent = null;
let updateCallback = null;

// Convert the plaintext passphrase to a SHA-256 hash so we never send the raw password
async function hashKey(key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let syncStatusCallback = null;
export function setSyncStatusCallback(cb) {
  syncStatusCallback = cb;
}

function updateSyncingState(state, userInitiated = false) {
  isSyncing = state;
  if (syncStatusCallback) syncStatusCallback(state, userInitiated);
}

export async function initSyncEngine(onRemoteUpdate) {
  updateCallback = onRemoteUpdate;
  
  // Load existing key if present
  const storedKey = localStorage.getItem('script_sync_key');
  if (storedKey) {
    syncKey = await hashKey(storedKey);
  }
}

export async function setSyncKey(key) {
  if (key) {
    localStorage.setItem('script_sync_key', key);
    syncKey = await hashKey(key);
    ensureCloudNote();
    // Trigger initial fetch when setting a new key
    if (isCloudNoteActive) {
      forceFetch();
    }
  } else {
    localStorage.removeItem('script_sync_key');
    syncKey = null;
    removeCloudNote();
    stopPolling();
  }
}

export function hasSyncKey() {
  return syncKey !== null;
}

export function setIsCloudNoteActive(active) {
  isCloudNoteActive = active;
  if (active && syncKey) {
    forceFetch();
    startPolling();
  } else {
    stopPolling();
    if (syncTimer) clearTimeout(syncTimer);
  }
}

// Queue an auto-save (debounced)
export function queueSyncSave(content) {
  if (!isCloudNoteActive || !syncKey) return;
  
  if (syncTimer) clearTimeout(syncTimer);
  
  syncTimer = setTimeout(async () => {
    // If the content hasn't changed since our last remote sync, don't waste a request
    if (content === lastSyncedContent) return;
    
    updateSyncingState(true);
    try {
      const res = await fetch(`/api/sync?key=${syncKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        lastSyncedContent = content;
      }
    } catch (e) {
      console.error('Failed to sync save', e);
    } finally {
      updateSyncingState(false);
    }
  }, 2000); // Wait 2 seconds after typing stops
}

// Immediately flush any pending save and force an un-debounced upload
export async function forceSyncSave(content, userInitiated = true) {
  if (!isCloudNoteActive || !syncKey) return false;
  if (syncTimer) clearTimeout(syncTimer);
  
  updateSyncingState(true, userInitiated);
  try {
    const res = await fetch(`/api/sync?key=${syncKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      lastSyncedContent = content;
      return true;
    }
  } catch (e) {
    console.error('Failed to force sync save', e);
  } finally {
    updateSyncingState(false, userInitiated);
  }
  return false;
}

export async function forceFetch(userInitiated = false) {
  if (!syncKey || isSyncing) return;
  
  updateSyncingState(true, userInitiated);
  try {
    const res = await fetch(`/api/sync?key=${syncKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data.content !== undefined && data.content !== lastSyncedContent) {
        lastSyncedContent = data.content;
        if (updateCallback) {
          updateCallback(data.content);
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch sync note', e);
  } finally {
    updateSyncingState(false, userInitiated);
  }
}

function startPolling() {
  stopPolling();
  // Poll every 10 seconds for external changes
  pollTimer = setInterval(() => {
    forceFetch();
  }, 10000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Re-fetch immediately if the window regains focus
window.addEventListener('focus', () => {
  if (isCloudNoteActive && syncKey) {
    forceFetch();
  }
});
