export function initMenu(menuEl, btnMenu, callbacks) {
  // Toggle visibility
  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    menuEl.classList.toggle('hidden');
    const isExpanded = !menuEl.classList.contains('hidden');
    btnMenu.setAttribute('aria-expanded', isExpanded);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuEl.contains(e.target) && !btnMenu.contains(e.target)) {
      menuEl.classList.add('hidden');
      btnMenu.setAttribute('aria-expanded', 'false');
    }
  });

  // Bind actions
  menuEl.querySelectorAll('li[data-action]').forEach(li => {
    li.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      const action = li.getAttribute('data-action');
      if (callbacks[action]) {
        callbacks[action]();
      }
    });
  });
}
