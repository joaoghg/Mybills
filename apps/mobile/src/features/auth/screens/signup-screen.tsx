import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { signUpInputSchema } from '@mybills/dtos/auth';

import type { AppTheme } from '../../../core/theme';
import { useSignUp } from '../hooks/use-sign-up';
import { InputField } from '../components/input-field';
import { AuthDivider, GoogleButton } from '../components/auth-common';
import { translateSignupError } from '../utils/sign-up-error';

type SignupScreenProps = {
  theme: AppTheme;
  onSwitchToLogin: () => void;
  onAuthenticated?: () => void;
};

export function SignupScreen({
  theme,
  onSwitchToLogin,
  onAuthenticated
}: SignupScreenProps) {
  const { t } = useTranslation();
  const { mutate, isPending, isError, error } = useSignUp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteMessage =
    isError && error ? translateSignupError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError(t('auth.errors.passwordMismatch'));
      return;
    }

    const parsed = signUpInputSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setLocalError(t('auth.errors.validation'));
      return;
    }

    mutate(parsed.data, {
      onSuccess: () => {
        onAuthenticated?.();
      }
    });
  }

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
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <InputField
          theme={theme}
          label={t('auth.emailLabel')}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <InputField
          theme={theme}
          label={t('auth.passwordLabel')}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
        />
        <InputField
          theme={theme}
          label={t('auth.confirmPasswordLabel')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {displayError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, styles.errorColor]}
          >
            {displayError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPending }}
          disabled={isPending}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
            isPending && styles.primaryButtonDisabled,
            pressed && !isPending && styles.primaryButtonPressed
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.textOnPrimary }]}>
            {isPending ? t('auth.signupLoading') : t('auth.signupAction')}
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
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  errorColor: {
    color: '#c62828'
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  primaryButtonDisabled: {
    opacity: 0.65
  },
  primaryButtonPressed: {
    opacity: 0.92
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
