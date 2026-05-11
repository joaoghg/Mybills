import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { logout } from '@mybills/api-client';

import { useHttpClient } from '../../../core/api/http-client-provider';
import { useAuthSession } from '../../../core/session/auth-session-provider';
import { clearSessionTokens } from '../../../core/session/session-tokens';
import type { AppTheme } from '../../../core/theme';

type HomePlaceholderScreenProps = {
  theme: AppTheme;
};

export function HomePlaceholderScreen({ theme }: HomePlaceholderScreenProps) {
  const { t } = useTranslation();
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
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {t('home.title')}
      </Text>
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
            {t('auth.signOut')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800'
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
