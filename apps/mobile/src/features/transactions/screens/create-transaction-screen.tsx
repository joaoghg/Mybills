import { createTransactionInputSchema, type CreateTransactionInput } from '@mybills/dtos';
import { listAccounts, listCategories, listCreditCards } from '@mybills/api-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { useTheme } from '@/core/theme';
import { CategorySelectPicker } from '@/features/transactions/components/category-select-picker';
import { TransactionDateField } from '@/features/transactions/components/transaction-date-field';
import { TransactionTypeSegment } from '@/features/transactions/components/transaction-type-segment';
import { useCreateTransaction } from '@/features/transactions/hooks/use-create-transaction';
import { translateCreateTransactionError } from '@/features/transactions/utils/create-transaction-error';
import {
  translateCreateTransactionZodError,
  validateCreateTransactionClient
} from '@/features/transactions/utils/create-transaction-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';
import { ymdFromLocalDate } from '@/shared/lib/billing-cycle';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

export function CreateTransactionScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const client = useHttpClient();
  const { mutate, isPending, isError, error } = useCreateTransaction();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(client)
  });

  const creditCardsQuery = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => listCreditCards(client)
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client)
  });

  const accounts = accountsQuery.data ?? [];
  const creditCards = creditCardsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const [type, setType] = useState<CreateTransactionInput['type']>('EXPENSE');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [dateYmd, setDateYmd] = useState(() => ymdFromLocalDate(new Date()));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const remoteMessage =
    isError && error ? translateCreateTransactionError(error, t) : null;
  const displayError = localError ?? remoteMessage;

  const filteredCategories = useMemo(() => {
    if (type === 'TRANSFER') {
      return [];
    }

    return categories.filter((category) => category.types.includes(type));
  }, [categories, type]);

  useEffect(() => {
    if (type === 'TRANSFER') {
      setSelectedCategoryId(null);
      return;
    }

    if (!selectedCategoryId) {
      return;
    }

    const stillValid = filteredCategories.some((category) => category.id === selectedCategoryId);
    if (!stillValid) {
      setSelectedCategoryId(null);
    }
  }, [filteredCategories, selectedCategoryId]);

  function handleSelectType(nextType: CreateTransactionInput['type']) {
    setType(nextType);

    if (nextType === 'TRANSFER') {
      setSelectedCategoryId(null);
      return;
    }

    if (selectedCategoryId) {
      const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
      if (!selectedCategory || !selectedCategory.types.includes(nextType)) {
        setSelectedCategoryId(null);
      }
    }
  }

  function handleSelectAccount(accountId: string | null) {
    setSelectedAccountId(accountId);
    if (accountId && type === 'INCOME') {
      setIsPaid(true);
    }

    if (!accountId) return;

    if (selectedCardId) {
      const card = creditCards.find((c) => c.id === selectedCardId) ?? null;
      const linkedAccountId = card?.accountId ?? null;
      if (linkedAccountId && linkedAccountId !== accountId) {
        setSelectedCardId(null);
      }
    }
  }

  function handleSelectCard(cardId: string | null) {
    setSelectedCardId(cardId);
    if (!cardId) return;

    const card = creditCards.find((c) => c.id === cardId) ?? null;
    const linkedAccountId = card?.accountId ?? null;
    if (linkedAccountId) {
      setSelectedAccountId(linkedAccountId);
    }
  }

  function handleSubmit() {
    setLocalError(null);

    const clientError = validateCreateTransactionClient(t, amountCents, isPaid, selectedAccountId);
    if (clientError) {
      setLocalError(clientError);
      return;
    }

    const payload = {
      type,
      amount: amountCents,
      date: dateYmd,
      isPaid,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(type !== 'TRANSFER' && selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
      ...(selectedCardId ? { cardId: selectedCardId } : {})
    };

    const parsed = createTransactionInputSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalError(translateCreateTransactionZodError(t, parsed.error));
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
        <TransactionTypeSegment
          theme={theme}
          selectedType={type}
          onSelect={handleSelectType}
        />

        <MoneyInputField
          theme={theme}
          label={t('transactions.amountLabel')}
          placeholder={t('transactions.amountPlaceholder')}
          cents={amountCents}
          onChangeCents={setAmountCents}
        />

        <InputField
          theme={theme}
          label={t('transactions.descriptionLabel')}
          placeholder={t('transactions.descriptionPlaceholder')}
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

        {type !== 'TRANSFER' ? (
          <CategorySelectPicker
            theme={theme}
            categories={filteredCategories}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        ) : null}

        {accounts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('transactions.accountLabel')}
            </Text>
            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedAccountId === null }}
                onPress={() => handleSelectAccount(null)}
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
                  {t('transactions.accountNone')}
                </Text>
              </Pressable>
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedAccountId === account.id }}
                  onPress={() => handleSelectAccount(account.id)}
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
          </View>
        ) : (
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            {t('transactions.noAccountsHint')}
          </Text>
        )}

        {type === 'EXPENSE' && creditCards.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('transactions.cardLabel')}
            </Text>
            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCardId === null }}
                onPress={() => handleSelectCard(null)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      selectedCardId === null ? theme.colors.primary : theme.colors.border
                  },
                  pressed && styles.optionPressed
                ]}
              >
                <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                  {t('transactions.cardNone')}
                </Text>
              </Pressable>
              {creditCards.map((card) => (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCardId === card.id }}
                  onPress={() => handleSelectCard(card.id)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor:
                        selectedCardId === card.id ? theme.colors.primary : theme.colors.border
                    },
                    pressed && styles.optionPressed
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                    {card.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
              {t('transactions.cardVsAccountHint')}
            </Text>
          </View>
        ) : type === 'EXPENSE' ? (
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            {t('transactions.noCardsHint')}
          </Text>
        ) : null}

        <View style={styles.paidRow}>
          <View style={styles.paidCopy}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('transactions.paidLabel')}
            </Text>
            <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
              {t('transactions.paidHint')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('transactions.paidLabel')}
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

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
            {isPending ? t('transactions.submitLoading') : t('transactions.submit')}
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
