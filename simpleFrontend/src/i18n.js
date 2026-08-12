import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './locales/ar.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

if (import.meta.hot) {
  import.meta.hot.accept(['./locales/ar.json', './locales/en.json'], (modules) => {
    const [newAr, newEn] = modules;
    if (newAr) i18n.addResourceBundle('ar', 'translation', newAr.default, true, true);
    if (newEn) i18n.addResourceBundle('en', 'translation', newEn.default, true, true);
    i18n.emit('languageChanged');
  });
}

export default i18n;
