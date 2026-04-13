import { useThemeContext } from './theme.provider';

export function useTheme() {
  const { theme, mode, resolvedMode, setMode, toggleMode } = useThemeContext();

  return {
    theme,
    mode,
    resolvedMode,
    setMode,
    toggleMode
  };
}
