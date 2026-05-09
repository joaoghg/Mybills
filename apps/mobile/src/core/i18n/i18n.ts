import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { defaultLanguage, type AppLanguage, resources } from './resources';

const supportedLanguages = Object.keys(resources) as AppLanguage[];

function resolveDeviceLanguage(): AppLanguage {
  const locale = getLocales()[0];

  if (!locale) {
    return defaultLanguage;
  }

  const languageTag = locale.languageTag;

  if (supportedLanguages.includes(languageTag as AppLanguage)) {
    return languageTag as AppLanguage;
  }

  if (locale.languageCode === 'pt') {
    return 'pt-BR';
  }

  return defaultLanguage;
}

void i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false
  }
});

export { i18next };
