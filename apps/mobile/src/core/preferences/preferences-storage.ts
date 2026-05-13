import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppLanguage } from '@/core/i18n/resources';
import type { ThemeMode } from '@/core/theme';

const STORAGE_KEY = 'mybills.user_prefs.v1';

export type PersistedUserPreferences = {
  onboardingCompleted: boolean;
  language: AppLanguage | null;
  themeMode: ThemeMode | null;
};

const defaultPersisted: PersistedUserPreferences = {
  onboardingCompleted: false,
  language: null,
  themeMode: null
};

function parseStored(raw: string | null): PersistedUserPreferences {
  if (!raw) {
    return { ...defaultPersisted };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ...defaultPersisted };
    }

    const o = parsed as Record<string, unknown>;
    const onboardingCompleted = o.onboardingCompleted === true;
    const language =
      o.language === 'en-US' || o.language === 'pt-BR' ? o.language : null;
    const themeMode =
      o.themeMode === 'light' || o.themeMode === 'dark' || o.themeMode === 'system'
        ? o.themeMode
        : null;

    return { onboardingCompleted, language, themeMode };
  } catch {
    return { ...defaultPersisted };
  }
}

export async function loadPreferences(): Promise<PersistedUserPreferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseStored(raw);
}

export async function savePreferences(
  partial: Partial<PersistedUserPreferences>
): Promise<PersistedUserPreferences> {
  const current = await loadPreferences();
  const next: PersistedUserPreferences = { ...current, ...partial };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
