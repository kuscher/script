import { get, set } from 'idb-keyval';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Fallback to standard input type=file if File System Access API is completely unsupported or denied.
 * But usually we handle fallback individually in openFile.
 */

export async function openFilePicker() {
  if (Capacitor.isNativePlatform()) {
    // We cannot easily use the native file picker to get a *persistable* file path without a custom plugin,
    // so we will fallback to the input[type=file] which triggers the Android Intent picker beautifully,
    // though it only gives us read-once access (no persistent handle).
    return fallbackInputFilePicker();
  }
  
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
           { description: 'Text Files', accept: { 'text/plain': ['.txt', '.md', '.rtf', '.json', '.js', '.csv', '.html', '.css'] } }
        ],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await readAsText(file); // Assume utf-8 initially
      return { handle, file, content };
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Error openFilePicker:', err);
      // user cancelled or error
      return null;
    }
  } else {
    return fallbackInputFilePicker();
  }
}

function fallbackInputFilePicker() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return resolve(null);
      const content = await readAsText(file);
      resolve({ handle: null, file, content }); // No handle in fallback
    };
    input.click();
  });
}

export async function saveFilePicker(content, defaultName = 'Untitled.txt') {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: defaultName,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      alert(`File saved to Documents folder as ${defaultName}`);
      return { capacitorPath: result.uri, name: defaultName };
    } catch (e) {
      console.error('Capacitor write failed', e);
      return null;
    }
  }

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          { description: 'Text Files', accept: { 'text/plain': ['.txt'] } },
          { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
          { description: 'Rich Text', accept: { 'text/rtf': ['.rtf'] } },
        ]
      });
      await saveFileToHandle(handle, content);
      return handle;
    } catch(err) {
      if (err.name !== 'AbortError') console.error('Error saveFilePicker:', err);
      return null;
    }
  } else {
    // Fallback download
    triggerDownload(content, defaultName);
    return null;
  }
}

export async function saveFileToHandle(handle, content) {
  if (handle && handle.capacitorPath) {
    await Filesystem.writeFile({
      path: handle.name,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return;
  }

  if (handle && 'createWritable' in handle) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    throw new Error('Handle is not writable');
  }
}

export async function verifyPermission(fileHandle, readWrite = true) {
  if (fileHandle && fileHandle.capacitorPath) return true; // Capacitor always has permission to Documents

  const options = { mode: readWrite ? 'readwrite' : 'read' };
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

export function readAsText(file, encoding = 'utf-8') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file, encoding);
  });
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
