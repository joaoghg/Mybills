import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { resolveThemeMode } from '@mybills/theme';

import { darkTheme, lightTheme } from './theme.tokens';
import type { AppTheme, ResolvedThemeMode, ThemeMode } from './theme.types';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (nextMode: ThemeMode) => void;
  toggleMode: () => void;
};

type ThemeProviderProps = {
  children: ReactNode;
  initialMode?: ThemeMode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, initialMode = 'system' }: ThemeProviderProps) {
  const systemMode = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    const currentSystemMode: ResolvedThemeMode = systemMode === 'dark' ? 'dark' : 'light';

    return resolveThemeMode(mode, currentSystemMode);
  }, [mode, systemMode]);

  const theme = useMemo(() => {
    return resolvedMode === 'dark' ? darkTheme : lightTheme;
  }, [resolvedMode]);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => {
      if (currentMode === 'system') {
        return resolvedMode === 'dark' ? 'light' : 'dark';
      }

      return currentMode === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedMode, setMode, toggleMode }),
    [mode, resolvedMode, theme, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }

  return context;
}
