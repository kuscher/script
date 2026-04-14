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
  aiApiKey: ''
};

let settings = { ...defaultSettings };
let notifyChange = null;

export function loadSettings(onChange) {
  notifyChange = onChange;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
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
      <label>Appearance</label>
      <div class="setting-row">
        <span>Theme</span>
        <select id="set-theme">
          <option value="system" ${settings.theme==='system'?'selected':''}>System</option>
          <option value="light" ${settings.theme==='light'?'selected':''}>Light</option>
          <option value="dark" ${settings.theme==='dark'?'selected':''}>Dark</option>
        </select>
      </div>
      <div class="setting-row">
        <span>Font Family</span>
        <select id="set-font">
          <option value="mono" ${settings.fontFamily==='mono'?'selected':''}>Monospace</option>
          <option value="sans" ${settings.fontFamily==='sans'?'selected':''}>Sans-Serif</option>
          <option value="serif" ${settings.fontFamily==='serif'?'selected':''}>Serif</option>
        </select>
      </div>
      <div class="setting-row" style="display:flex; flex-direction:column; align-items:flex-start; margin-top:24px;">
        <span style="margin-bottom:8px;">Font Size: <span id="set-size-disp">${settings.fontSize}</span>px</span>
        <input type="range" id="set-size" min="12" max="24" value="${settings.fontSize}" style="width:100%">
      </div>
    </div>
    
    <div class="setting-block" style="margin-top: 24px;">
      <label>AI Features</label>
      <div class="setting-row">
        <span>Enable @ queries</span>
        <label class="toggle-switch">
          <input type="checkbox" id="set-ai-enable" ${settings.aiMentionEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row" style="flex-direction: column; align-items: flex-start; margin-top: 16px;">
        <label for="set-ai-key" style="margin-bottom:8px; font-size:13px; color:var(--text-secondary);">Gemini API Key</label>
        <input type="password" id="set-ai-key" value="${settings.aiApiKey}" placeholder="AIza..." style="width: 100%; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-hairline); background: var(--bg-input); color: var(--text-primary);">
        <a href="https://aistudio.google.com/apikey" target="_blank" style="margin-top: 8px; font-size: 11px; color: var(--accent); text-decoration: none;">Get a free key from Google AI Studio &rarr;</a>
        <p style="margin-top: 4px; font-size: 10px; color: var(--text-placeholder); line-height: 1.4;">Your key is stored only on this device. Script never sees or transmits it.</p>
      </div>
    </div>
  `;
  
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
  container.querySelector('#set-ai-key').addEventListener('change', e => {
    settings.aiApiKey = e.target.value;
    saveSettings();
  });
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
