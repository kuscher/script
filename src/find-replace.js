export function initFindReplace(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // We are embedding directly into the header so we don't need a close button on the form itself.
  container.innerHTML = `
    <div class="find-wrapper">
      <div class="find-row">
        <i data-lucide="search" class="find-icon"></i>
        <input type="text" id="find-input" placeholder="Find...">
        <span id="find-count" class="find-count"></span>
        <div class="find-actions-inline">
          <button class="icon-btn-small" id="btn-find-prev" title="Previous (Shift+Enter)"><i data-lucide="arrow-up"></i></button>
          <button class="icon-btn-small" id="btn-find-next" title="Next (Enter)"><i data-lucide="arrow-down"></i></button>
          <div class="find-divider"></div>
          <button class="icon-btn-small" id="btn-toggle-replace" title="Toggle Replace"><i data-lucide="replace" id="replace-icon"></i></button>
        </div>
      </div>

      <div class="find-row hidden" id="replace-group">
        <i data-lucide="corner-down-right" class="find-icon" style="color: var(--text-placeholder);"></i>
        <input type="text" id="replace-input" placeholder="Replace with...">
        <div class="find-actions-inline">
          <button class="text-btn" id="btn-replace" title="Replace Current">Replace</button>
          <button class="text-btn" id="btn-replace-all" title="Replace All">All</button>
        </div>
      </div>
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
    isOpen: () => container.classList.contains('visible'),
    show: (showReplace) => {
      container.classList.remove('hidden');
      container.classList.add('visible');
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
    },
    hide: () => {
      container.classList.add('hidden');
      container.classList.remove('visible');
    }
  };
}
