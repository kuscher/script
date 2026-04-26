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
  useCloudModels: true
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
      <div class="setting-row" style="margin-top:16px;">
        <div style="display:flex; flex-direction:column;">
          <span>Use Cloud Models</span>
          <span style="font-size:11px; opacity:0.7; margin-top:4px;">Turn off to use 100% free, local on-device AI. (Requires Chrome with Gemini Nano enabled).</span>
        </div>
        <label class="toggle-switch" style="flex-shrink: 0; margin-left: 16px;">
          <input type="checkbox" id="set-ai-cloud" ${settings.useCloudModels ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
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
  const cloudToggle = container.querySelector('#set-ai-cloud');
  if (cloudToggle) {
    cloudToggle.addEventListener('change', e => {
      settings.useCloudModels = e.target.checked;
      saveSettings();
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
