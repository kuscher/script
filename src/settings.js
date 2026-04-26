import { getCurrentLanguage, changeLanguage, SUPPORTED_LANGUAGES, translateDOM } from './i18n.js';
import { setSyncKey } from './sync-engine.js';

const SETTINGS_KEY = 'script_settings';

let defaultSettings = {
  theme: 'system', // light, dark, system
  fontSize: 14,
  fontFamily: 'mono', // mono, serif, sans
  lineNumbers: true,
  wordWrap: true,
  autoIndent: true,
  tabSize: 4,
  aiMentionEnabled: false,
  aiProvider: 'cloud', // cloud, byot, local
  geminiApiKey: ''
};

let settings = { ...defaultSettings };
let notifyChange = null;

export function getSettings() {
  return settings;
}

export function loadSettings(onChange) {
  notifyChange = onChange;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.useCloudModels === false && !parsed.aiProvider) {
        parsed.aiProvider = 'local';
      } else if (!parsed.aiProvider) {
        parsed.aiProvider = 'cloud';
      }
      settings = { ...settings, ...parsed };
    }
  } catch(e) {}
  applySettings(settings);
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings(settings);
  if (notifyChange) notifyChange(settings);
}

export function openSettingsPanel(container, onBack) {
  container.innerHTML = '';
  // Built naive config form
  container.innerHTML = `
    <div class="setting-block">
      <label data-i18n="settings.appearance">Appearance</label>
      <div class="setting-row">
        <span data-i18n="settings.language">Language</span>
        <select id="set-language">
          ${SUPPORTED_LANGUAGES.map(l => `<option value="${l.code}" ${getCurrentLanguage() === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row">
        <span data-i18n="settings.theme">Theme</span>
        <select id="set-theme">
          <option value="system" ${settings.theme==='system'?'selected':''} data-i18n="settings.themeSystem">System</option>
          <option value="light" ${settings.theme==='light'?'selected':''} data-i18n="settings.themeLight">Light</option>
          <option value="dark" ${settings.theme==='dark'?'selected':''} data-i18n="settings.themeDark">Dark</option>
        </select>
      </div>
      <div class="setting-row">
        <span data-i18n="settings.fontFamily">Font Family</span>
        <select id="set-font">
          <option value="mono" ${settings.fontFamily==='mono'?'selected':''} data-i18n="settings.fontMono">Monospace</option>
          <option value="sans" ${settings.fontFamily==='sans'?'selected':''} data-i18n="settings.fontSans">Sans-Serif</option>
          <option value="serif" ${settings.fontFamily==='serif'?'selected':''} data-i18n="settings.fontSerif">Serif</option>
        </select>
      </div>
      <div class="setting-row" style="display:flex; flex-direction:column; align-items:flex-start; margin-top:24px;">
        <span style="margin-bottom:8px;"><span data-i18n="settings.fontSize">Font Size:</span> <span id="set-size-disp">${settings.fontSize}</span>px</span>
        <input type="range" id="set-size" min="12" max="24" value="${settings.fontSize}" style="width:100%">
      </div>
    </div>
    
    <div class="setting-block" style="margin-top: 24px;">
      <label data-i18n="settings.aiFeatures">AI Features</label>
      <div class="setting-row">
        <span data-i18n="settings.enableQueries">Enable @ queries</span>
        <label class="toggle-switch">
          <input type="checkbox" id="set-ai-enable" ${settings.aiMentionEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row" style="margin-top:16px; flex-direction:column; align-items:flex-start; gap:8px;">
        <span style="display:block; width:100%; font-weight: 500;" data-i18n="settings.activeEngine">Active AI Engine</span>
        <select id="set-ai-provider" style="width:100%; padding: 10px; border-radius: 8px;">
          <option value="cloud" ${settings.aiProvider === 'cloud' ? 'selected' : ''} data-i18n="settings.engineCloud">Free Cloud AI (Vercel)</option>
          <option value="byot" ${settings.aiProvider === 'byot' ? 'selected' : ''} data-i18n="settings.engineByot">Bring Your Own Token</option>
          <option value="local" ${settings.aiProvider === 'local' ? 'selected' : ''} ${!('ai' in window && 'languageModel' in window.ai) ? 'disabled' : ''} data-i18n="settings.engineLocal">Local On-Device (window.ai)</option>
        </select>
        <span style="font-size:11px; opacity:0.7;" data-i18n="settings.engineDesc">Select which engine processes your text. Local requires Chrome Gemini Nano.</span>
      </div>

      <div id="byot-container" style="display: ${settings.aiProvider === 'byot' ? 'block' : 'none'}; margin-top: 16px; background: var(--bg-tab-hover); padding: 12px; border-radius: 8px; border: 1px solid var(--border-hairline);">
        <label style="display:block; font-size:11px; margin-bottom:8px; color:var(--text-primary);" data-i18n="settings.geminiKey">Google Gemini API Key</label>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="password" id="set-api-key" placeholder="AIza..." value="${settings.geminiApiKey || ''}" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-hairline); background:var(--bg-find); color:var(--text-primary); font-family:var(--font-ui); box-sizing:border-box;">
          <button id="btn-verify-key" style="width:100%; padding:8px 12px; border-radius:6px; background:#A626A4; color:white; border:none; cursor:pointer; font-size:12px; font-weight:600; box-sizing:border-box;" data-i18n="settings.verify">Verify</button>
        </div>
        <span id="key-status" style="display:block; margin-top:8px; font-size:11px; color:var(--success);"></span>
      </div>
      </div>
    </div>
    
    <div class="setting-block">
      <label data-i18n="settings.sync">Cloud Sync</label>
      <div class="setting-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
        <span style="font-size:12px; color:var(--text-secondary);" data-i18n="settings.syncDesc">Share a single special note across instances using a secret passphrase. Requires Vercel KV.</span>
        <div style="display:flex; gap:8px; width:100%;">
          <input type="text" id="set-sync-key" placeholder="Enter passphrase..." style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border-hairline); background:var(--bg-find); color:var(--text-primary); font-family:var(--font-ui); box-sizing:border-box;">
          <button id="btn-save-sync" style="padding:8px 12px; border-radius:6px; background:#38BDF8; color:white; border:none; cursor:pointer; font-size:12px; font-weight:600;" data-i18n="settings.save">Save</button>
        </div>
        <button id="btn-generate-sync" style="padding:6px 10px; border-radius:6px; background:var(--bg-tab-hover); color:var(--text-primary); border:1px solid var(--border-hairline); cursor:pointer; font-size:11px;" data-i18n="settings.generatePhrase">Generate Passphrase</button>
        <span id="sync-status" style="font-size:11px; color:var(--success);"></span>
      </div>
    </div>
  `;
  
  translateDOM();
  
  const langSelect = container.querySelector('#set-language');
  if (langSelect) {
    langSelect.addEventListener('change', e => {
      changeLanguage(e.target.value);
    });
  }

  container.querySelector('#set-theme').addEventListener('change', e => {
    settings.theme = e.target.value;
    saveSettings();
  });
  container.querySelector('#set-font').addEventListener('change', e => {
    settings.fontFamily = e.target.value;
    saveSettings();
  });
  container.querySelector('#set-size').addEventListener('input', e => {
    settings.fontSize = e.target.value;
    container.querySelector('#set-size-disp').innerText = settings.fontSize;
    saveSettings();
  });
  container.querySelector('#set-ai-enable').addEventListener('change', e => {
    settings.aiMentionEnabled = e.target.checked;
    saveSettings();
  });
  const providerSelect = container.querySelector('#set-ai-provider');
  const byotContainer = container.querySelector('#byot-container');
  const btnVerify = container.querySelector('#btn-verify-key');
  const keyInput = container.querySelector('#set-api-key');
  const statusTxt = container.querySelector('#key-status');

  if (providerSelect) {
    providerSelect.addEventListener('change', e => {
      settings.aiProvider = e.target.value;
      if (settings.aiProvider === 'byot') {
        byotContainer.style.display = 'block';
      } else {
        byotContainer.style.display = 'none';
      }
      saveSettings();
    });
  }

  if (keyInput) {
    keyInput.addEventListener('input', e => {
      settings.geminiApiKey = e.target.value.trim();
      saveSettings();
      statusTxt.innerText = '';
    });
  }

  if (btnVerify) {
    btnVerify.addEventListener('click', async () => {
      if (!settings.geminiApiKey) {
        statusTxt.style.color = 'var(--danger)';
        statusTxt.innerText = 'Please enter an API key first.';
        return;
      }
      
      statusTxt.style.color = 'var(--text-secondary)';
      statusTxt.innerText = 'Verifying...';
      btnVerify.disabled = true;

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        });

        if (res.ok) {
          statusTxt.style.color = 'var(--success)';
          statusTxt.innerText = 'Valid API Key! Settings saved.';
        } else {
          statusTxt.style.color = 'var(--danger)';
          statusTxt.innerText = 'Invalid API Key. Please check and try again.';
        }
      } catch (err) {
        statusTxt.style.color = 'var(--danger)';
        statusTxt.innerText = 'Network error while verifying.';
      } finally {
        btnVerify.disabled = false;
      }
    });
  }

  // Cloud Sync Logic
  const btnSaveSync = container.querySelector('#btn-save-sync');
  const btnGenSync = container.querySelector('#btn-generate-sync');
  const inputSync = container.querySelector('#set-sync-key');
  const syncStatus = container.querySelector('#sync-status');

  const storedSyncKey = localStorage.getItem('script_sync_key');
  if (storedSyncKey) inputSync.value = storedSyncKey;

  if (btnSaveSync && inputSync) {
    btnSaveSync.addEventListener('click', async () => {
      const key = inputSync.value.trim();
      await setSyncKey(key);
      if (key) {
        syncStatus.innerText = 'Sync Key saved! Cloud Note is active.';
      } else {
        syncStatus.innerText = 'Sync Key cleared. Cloud Note disabled.';
      }
    });
  }

  if (btnGenSync && inputSync) {
    btnGenSync.addEventListener('click', () => {
      const words = ['apple', 'horse', 'staple', 'battery', 'purple', 'ocean', 'sunset', 'flying', 'turtle', 'mountain', 'river', 'forest', 'dragon', 'wizard', 'crystal', 'silver', 'golden', 'shadow', 'light', 'dream'];
      const getWord = () => words[Math.floor(Math.random() * words.length)];
      const phrase = `${getWord()}-${getWord()}-${getWord()}-${getWord()}`;
      inputSync.value = phrase;
      syncStatus.innerText = 'New phrase generated. Click Save to activate.';
    });
  }
}

function applySettings(s) {
  const root = document.documentElement;
  
  if (s.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', s.theme);
  
  root.style.setProperty('--editor-font-size', s.fontSize + 'px');
  
  if (s.fontFamily === 'mono') root.style.setProperty('--editor-font', 'var(--font-mono)');
  else if (s.fontFamily === 'sans') root.style.setProperty('--editor-font', 'var(--font-sans)');
  else if (s.fontFamily === 'serif') root.style.setProperty('--editor-font', 'var(--font-serif)');
}
