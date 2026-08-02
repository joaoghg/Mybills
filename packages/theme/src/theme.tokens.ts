import type { AppTheme, ThemePalette } from './theme.types';

export const palette: ThemePalette = {
  primary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B'
  },
  secondary: {
    50: '#F8FAFC',
    100: '#E2E8F0',
    200: '#CBD5E1',
    300: '#94A3B8',
    400: '#64748B',
    500: '#475569',
    600: '#334155',
    700: '#1E293B',
    800: '#0F172A',
    900: '#020617'
  },
  tertiary: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  },
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  }
};

export const lightTheme: AppTheme = {
  mode: 'light',
  palette,
  colors: {
    primary: '#10B981',
    secondary: '#0F172A',
    tertiary: '#334155',
    neutral: '#F8FAFC',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textOnPrimary: '#F8FAFC',
    textOnSecondary: '#F8FAFC',
    border: '#CBD5E1',
    overlay: 'rgba(15, 23, 42, 0.08)',
    danger: '#DC2626',
    positive: '#059669'
  }
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  palette,
  colors: {
    primary: '#10B981',
    secondary: '#0F172A',
    tertiary: '#334155',
    neutral: '#F8FAFC',
    background: '#020617',
    surface: '#0F172A',
    surfaceAlt: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textOnPrimary: '#F8FAFC',
    textOnSecondary: '#F8FAFC',
    border: '#334155',
    overlay: 'rgba(2, 6, 23, 0.45)',
    danger: '#F87171',
    positive: '#34D399'
  }
};
