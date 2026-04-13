import {
  darkTheme as sharedDarkTheme,
  lightTheme as sharedLightTheme,
  palette
} from '@mybills/theme';

import type { AppTheme, ThemeSizing } from './theme.types';

export { palette };

export const sizing: ThemeSizing = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999
  }
};

export const lightTheme: AppTheme = {
  ...sharedLightTheme,
  sizing
};

export const darkTheme: AppTheme = {
  ...sharedDarkTheme,
  sizing
};
