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
import { CreateTransactionScreen } from '@/features/transactions/screens/create-transaction-screen';
import { CreateTransferScreen } from '@/features/transfers/screens/create-transfer-screen';
import { CreateAccountScreen } from '@/features/accounts/screens/create-account-screen';
import { CreateCategoryScreen } from '@/features/categories/screens/create-category-screen';
import { EditCategoryScreen } from '@/features/categories/screens/edit-category-screen';
import { ManageCategoriesScreen } from '@/features/categories/screens/manage-categories-screen';
import { CreateCreditCardScreen } from '@/features/credit-cards/screens/create-credit-card-screen';
import { LanguageSettingsScreen } from '@/features/more/screens/language-settings-screen';
import { ThemeSettingsScreen } from '@/features/more/screens/theme-settings-screen';
import { AppTabNavigator } from '@/navigation/app-tab-navigator';
import { rootNavigationRef } from '@/navigation/root-navigation-ref';
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
    <NavigationContainer ref={rootNavigationRef} theme={navigationTheme}>
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
          name="AddAccount"
          component={CreateAccountScreen}
          options={{
            presentation: 'modal',
            title: t('quickAdd.accountTitle')
          }}
        />
        <Stack.Screen
          name="AddTransaction"
          component={CreateTransactionScreen}
          options={{
            presentation: 'modal',
            title: t('quickAdd.transactionTitle')
          }}
        />
        <Stack.Screen
          name="AddTransfer"
          component={CreateTransferScreen}
          options={{
            presentation: 'modal',
            title: t('quickAdd.transferTitle')
          }}
        />
        <Stack.Screen
          name="AddCreditCard"
          component={CreateCreditCardScreen}
          options={{
            presentation: 'modal',
            title: t('quickAdd.creditCardTitle')
          }}
        />
        <Stack.Screen
          name="AddCategory"
          component={CreateCategoryScreen}
          options={{
            presentation: 'modal',
            title: t('quickAdd.categoryTitle')
          }}
        />
        <Stack.Screen
          name="CategoryManagement"
          component={ManageCategoriesScreen}
          options={{
            title: t('categories.manageTitle')
          }}
        />
        <Stack.Screen
          name="EditCategory"
          component={EditCategoryScreen}
          options={{
            presentation: 'modal',
            title: t('categories.editTitle')
          }}
        />
        <Stack.Screen
          name="LanguageSettings"
          component={LanguageSettingsScreen}
          options={{
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{
            presentation: 'modal'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
