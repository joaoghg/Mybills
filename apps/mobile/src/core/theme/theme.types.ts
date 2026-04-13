import type { AppTheme as SharedAppTheme } from '@mybills/theme';

export type {
  ResolvedThemeMode,
  ThemeColorScale,
  ThemeColors,
  ThemeMode,
  ThemePalette
} from '@mybills/theme';

export type ThemeSizing = {
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
};

export type AppTheme = SharedAppTheme & {
  sizing: ThemeSizing;
};
