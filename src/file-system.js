import { get, set } from 'idb-keyval';

/**
 * Fallback to standard input type=file if File System Access API is completely unsupported or denied.
 * But usually we handle fallback individually in openFile.
 */

export async function openFilePicker() {
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
    // Fallback: use input[type=file]
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
}

export async function saveFilePicker(content, defaultName = 'Untitled.txt') {
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
  if ('createWritable' in handle) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    throw new Error('Handle is not writable');
  }
}

export async function verifyPermission(fileHandle, readWrite = true) {
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
