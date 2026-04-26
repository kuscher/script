import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// Top 20 Languages mapped to their native names
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文 (Mandarin)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'yue', name: '粵語 (Cantonese)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'ko', name: '한국어 (Korean)' }
];

export async function initI18n() {
  await i18next
    .use(LanguageDetector)
    .use(resourcesToBackend((language, namespace) => import(`./locales/${language}.json`)))
    .init({
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
      load: 'languageOnly',
      debug: false,
    });

  // Observe DOM for dynamic nodes? No, we will explicitly translate existing nodes
  translateDOM();
}

export function translateDOM() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = i18next.t(key);
    
    // Support placeholder attributes as well if needed
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
       el.setAttribute('placeholder', translation);
    } else {
       // Keep children if there are icons
       if (el.querySelector('i[data-lucide]')) {
         const icon = el.querySelector('i[data-lucide]').outerHTML;
         el.innerHTML = `${icon} ${translation}`;
       } else {
         el.textContent = translation;
       }
    }
  });
}

export async function changeLanguage(lng) {
  await i18next.changeLanguage(lng);
  translateDOM();
}

export function getCurrentLanguage() {
  return i18next.resolvedLanguage || i18next.language;
}
