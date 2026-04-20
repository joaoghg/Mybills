import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '../../../core/theme';
import { InputField } from '../components/input-field';
import { AuthDivider, GoogleButton } from '../components/auth-common';

type SignupScreenProps = {
  theme: AppTheme;
  onSwitchToLogin: () => void;
};

export function SignupScreen({ theme, onSwitchToLogin }: SignupScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        <InputField
          theme={theme}
          label={t('auth.nameLabel')}
          placeholder={t('auth.namePlaceholder')}
        />
        <InputField
          theme={theme}
          label={t('auth.emailLabel')}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputField
          theme={theme}
          label={t('auth.passwordLabel')}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <InputField
          theme={theme}
          label={t('auth.confirmPasswordLabel')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.textOnPrimary }]}>
            {t('auth.signupAction')}
          </Text>
        </Pressable>
      </View>

      <AuthDivider theme={theme} />

      <GoogleButton theme={theme} />

      <Pressable accessibilityRole="button" onPress={onSwitchToLogin}>
        <Text style={[styles.switchText, { color: theme.colors.textSecondary }]}>
          {t('auth.switchToLogin')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14
  },
  form: {
    gap: 14
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800'
  },
  switchText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 8
  }
});
