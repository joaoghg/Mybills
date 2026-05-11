import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme';
import { AddPlaceholderScreen } from '@/features/add/screens/add-placeholder-screen';
import { AppTabNavigator } from '@/navigation/app-tab-navigator';
import type { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AuthenticatedRoot() {
  const { theme, resolvedMode } = useTheme();
  const { t } = useTranslation();

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = resolvedMode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        notification: theme.colors.primary
      }
    };
  }, [resolvedMode, theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: theme.colors.primary,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.textPrimary, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      >
        <Stack.Screen name="MainTabs" options={{ headerShown: false }} component={AppTabNavigator} />
        <Stack.Screen
          name="AddPlaceholder"
          component={AddPlaceholderScreen}
          options={{
            presentation: 'modal',
            title: t('add.title')
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
