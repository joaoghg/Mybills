import type { ResolvedThemeMode, ThemeMode } from './theme.types';

export function resolveThemeMode(
  mode: ThemeMode,
  systemMode: ResolvedThemeMode
): ResolvedThemeMode {
  if (mode === 'system') {
    return systemMode;
  }

  return mode;
}
