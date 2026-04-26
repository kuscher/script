import { icons, createIcons } from 'lucide';

let deferredPrompt = null;

export function initFirstRun() {
  const drawer = document.getElementById('first-run-drawer');
  const btnInstall = document.getElementById('btn-first-run-install');
  const btnDismiss = document.getElementById('btn-first-run-dismiss');

  if (!drawer) return;

  // Stash the install prompt globally
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  const isFirstRun = !localStorage.getItem('script_first_run_complete');
  
  if (isFirstRun) {
    drawer.classList.remove('hidden');
    // Ensure icons are rendered in the drawer
    createIcons({ icons, nameAttr: 'data-lucide' });
  }

  function dismissDrawer() {
    localStorage.setItem('script_first_run_complete', 'true');
    drawer.classList.add('morphing');
    
    // Wait for morph animation (500ms) to complete before hiding fully
    setTimeout(() => {
      drawer.classList.add('hidden');
      drawer.classList.remove('morphing');
    }, 500);
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      } else {
        // Fallback for unsupported browsers
        alert('App installation is not supported in this browser, or it is already installed.');
      }
      dismissDrawer();
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      dismissDrawer();
    });
  }
}
