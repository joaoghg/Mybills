import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@mybills/api-client';

import { useHttpClient } from '@/core/api/http-client-provider';
import { useAuthSession } from '@/core/session/auth-session-provider';
import { clearSessionTokens } from '@/core/session/session-tokens';
import { useTheme } from '@/core/theme';
import { navigateRoot } from '@/navigation/root-navigation-ref';

export function MoreScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const client = useHttpClient();
  const { markSignedOut } = useAuthSession();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      try {
        await logout(client);
      } catch {
        // ignore API errors; always clear local session
      }
      await clearSessionTokens();
      markSignedOut();
      queryClient.clear();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 24 }
      ]}
    >
      <View style={[styles.headerBlock, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('more.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('more.subtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigateRoot('CategoryManagement')}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: theme.colors.textPrimary }]}>
            {t('more.categoriesRow')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigateRoot('OpenFinanceSettings')}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: theme.colors.textPrimary }]}>
            {t('more.moreRow')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigateRoot('Investments')}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: theme.colors.textPrimary }]}>
            {t('more.investmentsRow')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigateRoot('LanguageSettings')}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: theme.colors.textPrimary }]}>
            {t('more.languageRow')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigateRoot('ThemeSettings')}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: theme.colors.textPrimary }]}>
            {t('more.themeRow')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: signingOut }}
          disabled={signingOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.colors.primary },
            signingOut && styles.buttonDisabled,
            pressed && !signingOut && styles.buttonPressed
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color={theme.colors.textOnPrimary} />
          ) : (
            <Text style={[styles.buttonLabel, { color: theme.colors.textOnPrimary }]}>
              {t('more.signOut')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 24
  },
  headerBlock: {
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22
  },
  actions: {
    gap: 12
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1
  },
  secondaryButtonLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700'
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonPressed: {
    opacity: 0.92
  },
  buttonLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700'
  }
});
