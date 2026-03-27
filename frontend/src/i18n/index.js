import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './ko.json';
import en from './en.json';
import vi from './vi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      vi: { translation: vi }
    },
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'chancehr-lang',
      caches: ['localStorage']
    }
  });

export default i18n;
