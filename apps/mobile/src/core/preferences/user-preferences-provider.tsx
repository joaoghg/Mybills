import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { i18next } from '@/core/i18n/i18n';
import type { AppLanguage } from '@/core/i18n/resources';
import { useThemeContext } from '@/core/theme/theme.provider';
import type { ThemeMode } from '@/core/theme/theme.types';

import { loadPreferences, savePreferences } from './preferences-storage';

type UserPreferencesContextValue = {
  hydrated: boolean;
  onboardingCompleted: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  completeOnboarding: (input: { language: AppLanguage; themeMode: ThemeMode }) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

type UserPreferencesProviderProps = {
  children: ReactNode;
};

export function UserPreferencesProvider({ children }: UserPreferencesProviderProps) {
  const { setMode } = useThemeContext();
  const [hydrated, setHydrated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const prefs = await loadPreferences();
      if (cancelled) {
        return;
      }

      if (prefs.language) {
        await i18next.changeLanguage(prefs.language);
      }

      if (prefs.themeMode) {
        setMode(prefs.themeMode);
      }

      setOnboardingCompleted(prefs.onboardingCompleted);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [setMode]);

  const setLanguage = useCallback(async (language: AppLanguage) => {
    await i18next.changeLanguage(language);
    await savePreferences({ language });
  }, []);

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      setMode(mode);
      await savePreferences({ themeMode: mode });
    },
    [setMode]
  );

  const completeOnboarding = useCallback(
    async (input: { language: AppLanguage; themeMode: ThemeMode }) => {
      await i18next.changeLanguage(input.language);
      setMode(input.themeMode);
      await savePreferences({
        onboardingCompleted: true,
        language: input.language,
        themeMode: input.themeMode
      });
      setOnboardingCompleted(true);
    },
    [setMode]
  );

  const value = useMemo(
    (): UserPreferencesContextValue => ({
      hydrated,
      onboardingCompleted,
      setLanguage,
      setThemeMode,
      completeOnboarding
    }),
    [hydrated, onboardingCompleted, setLanguage, setThemeMode, completeOnboarding]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return ctx;
}
