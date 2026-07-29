import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listAccounts } from '@mybills/api-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createCreditCardInputSchema } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { useTheme } from '@/core/theme';
import { useCreateCreditCard } from '@/features/credit-cards/hooks/use-create-credit-card';
import { translateCreateCreditCardError } from '@/features/credit-cards/utils/create-credit-card-error';
import { translateCreateCreditCardZodError } from '@/features/credit-cards/utils/create-credit-card-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCreditCard'>;

function parseDayInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function CreateCreditCardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const client = useHttpClient();
  const { mutate, isPending, isError, error } = useCreateCreditCard();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(client)
  });

  const accounts = accountsQuery.data ?? [];

  const [name, setName] = useState('');
  const [limitCents, setLimitCents] = useState(0);
  const [closingDayText, setClosingDayText] = useState('');
  const [closingOnLastDay, setClosingOnLastDay] = useState(false);
  const [dueDayText, setDueDayText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteMessage =
    isError && error ? translateCreateCreditCardError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const payload = {
      ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
      name,
      limit: limitCents,
      ...(closingOnLastDay
        ? { closingOnLastDay: true }
        : { closingDay: parseDayInput(closingDayText), closingOnLastDay: false }),
      dueDay: parseDayInput(dueDayText)
    };

    const parsed = createCreditCardInputSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalError(translateCreateCreditCardZodError(t, parsed.error));
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
          label={t('creditCards.nameLabel')}
          placeholder={t('creditCards.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <MoneyInputField
          theme={theme}
          label={t('creditCards.limitLabel')}
          placeholder={t('creditCards.limitPlaceholder')}
          cents={limitCents}
          onChangeCents={setLimitCents}
        />
        <View style={styles.paidRow}>
          <View style={styles.paidCopy}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('creditCards.closingOnLastDayLabel')}
            </Text>
            <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
              {t('creditCards.closingOnLastDayHint')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('creditCards.closingOnLastDayLabel')}
            value={closingOnLastDay}
            onValueChange={setClosingOnLastDay}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
        {!closingOnLastDay ? (
          <InputField
            theme={theme}
            label={t('creditCards.closingDayLabel')}
            placeholder={t('creditCards.closingDayPlaceholder')}
            value={closingDayText}
            onChangeText={setClosingDayText}
            keyboardType="number-pad"
          />
        ) : null}
        <InputField
          theme={theme}
          label={t('creditCards.dueDayLabel')}
          placeholder={t('creditCards.dueDayPlaceholder')}
          value={dueDayText}
          onChangeText={setDueDayText}
          keyboardType="number-pad"
        />

        {accounts.length > 0 ? (
          <View style={styles.accountSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('creditCards.accountLabel')}
            </Text>
            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedAccountId === null }}
                onPress={() => setSelectedAccountId(null)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      selectedAccountId === null ? theme.colors.primary : theme.colors.border
                  },
                  pressed && styles.optionPressed
                ]}
              >
                <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                  {t('creditCards.noAccountOption')}
                </Text>
              </Pressable>
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedAccountId === account.id }}
                  onPress={() => setSelectedAccountId(account.id)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor:
                        selectedAccountId === account.id
                          ? theme.colors.primary
                          : theme.colors.border
                    },
                    pressed && styles.optionPressed
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                    {account.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
              {t('creditCards.accountHint')}
            </Text>
          </View>
        ) : (
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            {t('creditCards.noAccountsHint')}
          </Text>
        )}

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
            {isPending ? t('creditCards.submitLoading') : t('creditCards.submit')}
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
  accountSection: {
    gap: 10
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  options: {
    gap: 10
  },
  optionCard: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600'
  },
  optionPressed: {
    opacity: 0.92
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: -6
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  paidCopy: {
    flex: 1,
    gap: 4
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
