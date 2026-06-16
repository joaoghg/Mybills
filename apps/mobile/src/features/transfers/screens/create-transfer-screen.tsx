import { createTransferInputSchema } from '@mybills/dtos';
import { listAccounts } from '@mybills/api-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { useTheme } from '@/core/theme';
import { TransactionDateField } from '@/features/transactions/components/transaction-date-field';
import { useCreateTransfer } from '@/features/transfers/hooks/use-create-transfer';
import { translateCreateTransferError } from '@/features/transfers/utils/create-transfer-error';
import {
  translateCreateTransferZodError,
  validateCreateTransferClient
} from '@/features/transfers/utils/create-transfer-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';
import { ymdFromLocalDate } from '@/shared/lib/billing-cycle';
import { centsToMajor } from '@/shared/utils/cents-to-major';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransfer'>;

function AccountPicker({
  accounts,
  label,
  selectedAccountId,
  onSelect,
  locale,
  theme
}: {
  accounts: Array<{ id: string; name: string; balance: number }>;
  label: string;
  selectedAccountId: string | null;
  onSelect: (accountId: string) => void;
  locale: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={styles.options}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedAccountId === account.id }}
            onPress={() => onSelect(account.id)}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  selectedAccountId === account.id ? theme.colors.primary : theme.colors.border
              },
              pressed && styles.optionPressed
            ]}
          >
            <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
              {account.name}
            </Text>
            <Text style={[styles.optionBalance, { color: theme.colors.textSecondary }]}>
              {formatCurrencyValue(centsToMajor(account.balance), locale)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function CreateTransferScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const client = useHttpClient();
  const { mutate, isPending, isError, error } = useCreateTransfer();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(client)
  });

  const accounts = accountsQuery.data ?? [];

  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [dateYmd, setDateYmd] = useState(() => ymdFromLocalDate(new Date()));
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteMessage = isError && error ? translateCreateTransferError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const clientError = validateCreateTransferClient(
      t,
      amountCents,
      sourceAccountId,
      destinationAccountId
    );
    if (clientError) {
      setLocalError(clientError);
      return;
    }

    const payload = {
      sourceAccountId: sourceAccountId!,
      destinationAccountId: destinationAccountId!,
      amount: amountCents,
      date: dateYmd,
      ...(description.trim() ? { description: description.trim() } : {})
    };

    const parsed = createTransferInputSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalError(translateCreateTransferZodError(t, parsed.error));
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
        <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
          {t('transfers.hint')}
        </Text>

        <MoneyInputField
          theme={theme}
          label={t('transfers.amountLabel')}
          placeholder={t('transfers.amountPlaceholder')}
          cents={amountCents}
          onChangeCents={setAmountCents}
        />

        <InputField
          theme={theme}
          label={t('transfers.descriptionLabel')}
          placeholder={t('transfers.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
        />

        <TransactionDateField
          theme={theme}
          valueYmd={dateYmd}
          locale={i18n.language}
          onChangeYmd={setDateYmd}
        />

        {accounts.length >= 2 ? (
          <>
            <AccountPicker
              accounts={accounts}
              label={t('transfers.sourceAccountLabel')}
              selectedAccountId={sourceAccountId}
              onSelect={setSourceAccountId}
              locale={i18n.language}
              theme={theme}
            />
            <AccountPicker
              accounts={accounts}
              label={t('transfers.destinationAccountLabel')}
              selectedAccountId={destinationAccountId}
              onSelect={setDestinationAccountId}
              locale={i18n.language}
              theme={theme}
            />
          </>
        ) : (
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            {t('transfers.noAccountsHint')}
          </Text>
        )}

        {displayError ? (
          <Text accessibilityLiveRegion="polite" style={[styles.errorText, styles.errorColor]}>
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
            {isPending ? t('transfers.submitLoading') : t('transfers.submit')}
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
  section: {
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
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 2
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600'
  },
  optionBalance: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500'
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
