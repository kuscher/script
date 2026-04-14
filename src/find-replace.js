export function initFindReplace(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // We are embedding directly into the header so we don't need a close button on the form itself.
  container.innerHTML = `
    <div class="find-input-group">
      <i data-lucide="search" style="width:20px; color:var(--text-placeholder);"></i>
      <input type="text" id="find-input" placeholder="Find / Replace...">
      <input type="text" id="replace-input" placeholder="Replace" class="hidden" style="border-left: 1px solid var(--border-hairline); padding-left:12px; margin-left:4px;">
    </div>
    <div class="find-actions">
      <span id="find-count" style="margin-right: 8px;"></span>
      <button class="toggle-btn" id="btn-toggle-preview" title="Toggle Markdown Preview" style="display: none;"><i data-lucide="eye"></i></button>
    </div>
  `;

  return {
    show: (showReplace) => {
      // Find bar is always visible, but bringing focus logic.
      const rep = document.getElementById('replace-input');
      if (showReplace) {
         rep.classList.remove('hidden');
         rep.focus();
      } else {
         rep.classList.add('hidden');
         document.getElementById('find-input').focus();
      }
    }
  };
}
