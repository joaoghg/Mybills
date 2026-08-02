import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createAccountInputSchema } from '@mybills/dtos';

import { useTheme } from '@/core/theme';
import { useCreateAccount } from '@/features/accounts/hooks/use-create-account';
import { translateCreateAccountError } from '@/features/accounts/utils/create-account-error';
import { translateCreateAccountZodError } from '@/features/accounts/utils/create-account-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'AddAccount'>;

export function CreateAccountScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { mutate, isPending, isError, error } = useCreateAccount();

  const [name, setName] = useState('');
  const [balanceCents, setBalanceCents] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteMessage =
    isError && error ? translateCreateAccountError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const parsed = createAccountInputSchema.safeParse({
      name,
      balance: balanceCents
    });
    if (!parsed.success) {
      setLocalError(translateCreateAccountZodError(t, parsed.error));
      return;
    }

    mutate(parsed.data, {
      onSuccess: () => {
        navigation.goBack();
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
          label={t('accounts.nameLabel')}
          placeholder={t('accounts.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <MoneyInputField
          theme={theme}
          label={t('accounts.balanceLabel')}
          placeholder={t('accounts.balancePlaceholder')}
          cents={balanceCents}
          onChangeCents={setBalanceCents}
        />
        <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
          {t('accounts.balanceHint')}
        </Text>

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
            {isPending ? t('accounts.submitLoading') : t('accounts.submit')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14
  },
  form: {
    gap: 14
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: -6
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
    paddingHorizontal: 18,
    marginTop: 4
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
  }
});
