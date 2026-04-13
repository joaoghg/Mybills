export type ThemeMode = 'light' | 'dark' | 'system';

export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export type ThemeColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type ThemePalette = {
  primary: ThemeColorScale;
  secondary: ThemeColorScale;
  tertiary: ThemeColorScale;
  neutral: ThemeColorScale;
};

export type ThemeColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnSecondary: string;
  border: string;
  overlay: string;
};

export type AppTheme = {
  mode: ResolvedThemeMode;
  colors: ThemeColors;
  palette: ThemePalette;
};
