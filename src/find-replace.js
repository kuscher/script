export function initFindReplace(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // We are embedding directly into the header so we don't need a close button on the form itself.
  container.innerHTML = `
    <div class="find-wrapper">
      <div class="find-input-group">
        <i data-lucide="search" style="width:16px; height:16px; color:var(--text-placeholder); margin-right:4px;"></i>
        <input type="text" id="find-input" placeholder="Find...">
        <span id="find-count" style="font-size: 11px; color: var(--text-secondary); min-width: 30px; text-align:center; user-select:none;"></span>
        <div class="find-nav-buttons">
          <button class="icon-btn" id="btn-find-prev" title="Previous (Shift+Enter)"><i data-lucide="arrow-up" style="width:16px; height:16px;"></i></button>
          <button class="icon-btn" id="btn-find-next" title="Next (Enter)"><i data-lucide="arrow-down" style="width:16px; height:16px;"></i></button>
        </div>
        <div class="find-divider"></div>
        <button class="icon-btn" id="btn-toggle-replace" title="Toggle Replace"><i data-lucide="replace" id="replace-icon" style="width:16px; height:16px;"></i></button>
      </div>

      <div class="find-input-group hidden" id="replace-group">
        <input type="text" id="replace-input" placeholder="Replace with...">
        <button class="text-btn" id="btn-replace" title="Replace Current">Replace</button>
        <button class="text-btn" id="btn-replace-all" title="Replace All">All</button>
      </div>
    </div>
    <div class="find-actions">
      <button class="toggle-btn" id="btn-toggle-word-wrap" title="Toggle Word Wrap"><i data-lucide="wrap-text"></i></button>
      <button class="toggle-btn" id="btn-toggle-preview" title="Toggle Markdown Preview" style="display: none;"><i data-lucide="eye"></i></button>
    </div>
  `;

  setTimeout(() => {
    const btnToggle = document.getElementById('btn-toggle-replace');
    let replaceOpen = false;
    
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
         replaceOpen = !replaceOpen;
         document.getElementById('replace-group').classList.toggle('hidden', !replaceOpen);
         btnToggle.classList.toggle('active', replaceOpen);
      });
    }
  }, 100);

  return {
    show: (showReplace) => {
      const repGroup = document.getElementById('replace-group');
      const btnToggle = document.getElementById('btn-toggle-replace');
      if (showReplace) {
         repGroup.classList.remove('hidden');
         if(btnToggle) btnToggle.classList.add('active');
         document.getElementById('replace-input').focus();
      } else {
         repGroup.classList.add('hidden');
         if(btnToggle) btnToggle.classList.remove('active');
         document.getElementById('find-input').focus();
      }
    }
  };
}
