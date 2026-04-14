export function initStatusBar(domElements) {
  const { encoding, lineEnding, cursor, words, filetype, picker } = domElements;
  
  let currentEncoding = 'utf-8';
  let currentLf = 'LF';

  // Toggle Picker
  encoding.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('hidden');
  });

  // Close picker on outside click
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && !encoding.contains(e.target)) {
      picker.classList.add('hidden');
    }
  });

  // Encoding selection
  picker.querySelectorAll('li[data-enc]').forEach(li => {
    li.addEventListener('click', () => {
      currentEncoding = li.getAttribute('data-enc');
      // Update label
      encoding.innerHTML = `${li.innerText} <i data-lucide="chevron-down" style="width:12px"></i>`;
      picker.classList.add('hidden');
      if (domElements.onEncodingChange) domElements.onEncodingChange(currentEncoding);
      
      // We would normally need to re-render lucide icons if we inject raw HTML string with data-lucide
      // but status bar chevron is static usually. If needed, call createIcons.
    });
  });

  // Line ending toggle
  lineEnding.addEventListener('click', () => {
    currentLf = currentLf === 'LF' ? 'CRLF' : 'LF';
    lineEnding.innerText = currentLf;
    if (domElements.onLfChange) domElements.onLfChange(currentLf);
  });

  return {
    updateFormat: (filename) => {
      let ftype = 'Plain Text';
      if (filename.endsWith('.md')) ftype = 'Markdown';
      if (filename.endsWith('.rtf')) ftype = 'Rich Text';
      filetype.innerText = ftype;
    },
    updateStats: (text, pos = null) => {
      const wCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      words.innerText = `${wCount} words`;
      // We don't have accurate pos from generic text length right now.
      if (pos) {
         cursor.innerText = `Ln ${pos.line}, Col ${pos.col}`;
      }
    }
  };
}
