import type { TransactionSeriesScope, UpdateTransactionInput } from '@mybills/dtos';
import { updateTransactionInputSchema } from '@mybills/dtos';
import { listAccounts, listCategories, listCreditCards } from '@mybills/api-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { useTheme } from '@/core/theme';
import { CategorySelectPicker } from '@/features/transactions/components/category-select-picker';
import { TransactionDateField } from '@/features/transactions/components/transaction-date-field';
import { TransactionScheduleSegment } from '@/features/transactions/components/transaction-schedule-segment';
import { TransactionTypeSegment } from '@/features/transactions/components/transaction-type-segment';
import { useDeleteTransaction } from '@/features/transactions/hooks/use-delete-transaction';
import { useTransaction } from '@/features/transactions/hooks/use-transaction';
import { useUpdateTransaction } from '@/features/transactions/hooks/use-update-transaction';
import { translateCreateTransactionError } from '@/features/transactions/utils/create-transaction-error';
import {
  translateCreateTransactionZodError,
  validateCreateTransactionClient,
  type ScheduleMode
} from '@/features/transactions/utils/create-transaction-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';
import {
  formatYearMonth,
  getInvoicePaymentMonth,
  inclusivePaymentMonthCount,
  parseYearMonth
} from '@/shared/lib/billing-cycle';

type Props = NativeStackScreenProps<RootStackParamList, 'EditTransaction'>;

function monthSpanInclusive(startYmd: string, endYmd: string): number {
  const start = startYmd.split('-').map(Number);
  const end = endYmd.split('-').map(Number);
  const startMonths = (start[0] ?? 0) * 12 + ((start[1] ?? 1) - 1);
  const endMonths = (end[0] ?? 0) * 12 + ((end[1] ?? 1) - 1);
  return endMonths - startMonths + 1;
}

function seriesTypeToScheduleMode(
  seriesType: 'INSTALLMENT' | 'RECURRING' | null | undefined
): ScheduleMode {
  if (seriesType === 'INSTALLMENT') {
    return 'INSTALLMENT';
  }
  if (seriesType === 'RECURRING') {
    return 'RECURRING';
  }
  return 'NONE';
}

export function EditTransactionScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const client = useHttpClient();
  const transactionQuery = useTransaction(transactionId);
  const { mutate, isPending, isError, error } = useUpdateTransaction();
  const {
    mutate: deleteTransaction,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError
  } = useDeleteTransaction();

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
  const transaction = transactionQuery.data;

  const [type, setType] = useState<UpdateTransactionInput['type']>('EXPENSE');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [dateYmd, setDateYmd] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('NONE');
  const [endDateYmd, setEndDateYmd] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [initialIsPaid, setInitialIsPaid] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setType(transaction.type === 'TRANSFER' ? 'EXPENSE' : transaction.type);
    setAmountCents(transaction.amount);
    setDescription(transaction.description ?? '');
    setDateYmd(transaction.date.split('T')[0] ?? transaction.date);
    setScheduleMode(seriesTypeToScheduleMode(transaction.seriesType));
    setEndDateYmd(null);
    setSelectedCategoryId(transaction.categoryId);
    setSelectedAccountId(transaction.accountId);
    setSelectedCardId(transaction.cardId);
    setIsPaid(transaction.isPaid);
    setInitialIsPaid(transaction.isPaid);
  }, [transaction]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('transactions.editTitle') });
  }, [navigation, t]);

  const filteredCategories = useMemo(() => {
    if (!type || type === 'TRANSFER') {
      return [];
    }

    return categories.filter((category) => category.types.includes(type));
  }, [categories, type]);

  const originalScheduleMode = seriesTypeToScheduleMode(transaction?.seriesType);
  const scheduleChanged = scheduleMode !== originalScheduleMode;

  const scheduleOptions = useMemo(() => {
    if (transaction?.seriesId) {
      return [
        { value: 'INSTALLMENT' as const, label: t('transactions.scheduleModes.installment') },
        { value: 'RECURRING' as const, label: t('transactions.scheduleModes.recurring') }
      ];
    }

    return [
      { value: 'NONE' as const, label: t('transactions.scheduleModes.none') },
      { value: 'INSTALLMENT' as const, label: t('transactions.scheduleModes.installment') },
      { value: 'RECURRING' as const, label: t('transactions.scheduleModes.recurring') }
    ];
  }, [t, transaction?.seriesId]);

  const selectedCard = useMemo(
    () => creditCards.find((card) => card.id === selectedCardId) ?? null,
    [creditCards, selectedCardId]
  );

  const cardInstallmentSummary = useMemo(() => {
    if (scheduleMode !== 'INSTALLMENT' || !endDateYmd || !selectedCard) {
      return null;
    }

    const firstPay = getInvoicePaymentMonth(selectedCard.closingDay, selectedCard.dueDay, dateYmd);
    const lastPay = parseYearMonth(endDateYmd);
    const count = inclusivePaymentMonthCount(firstPay, lastPay);
    if (count < 2) {
      return null;
    }

    return {
      count,
      first: formatYearMonth(firstPay),
      last: formatYearMonth(lastPay)
    };
  }, [scheduleMode, endDateYmd, selectedCard, dateYmd]);

  const installmentCount =
    scheduleMode === 'INSTALLMENT' && endDateYmd && !selectedCard
      ? monthSpanInclusive(dateYmd, endDateYmd)
      : cardInstallmentSummary?.count ?? null;

  const remoteMessage =
    isError && error ? translateCreateTransactionError(error, t) : null;
  const deleteRemoteMessage =
    isDeleteError && deleteError ? translateCreateTransactionError(deleteError, t) : null;
  const displayError = localError ?? remoteMessage ?? deleteRemoteMessage;

  function handleSelectType(nextType: NonNullable<UpdateTransactionInput['type']>) {
    setType(nextType);

    if (nextType === 'TRANSFER') {
      setSelectedCategoryId(null);
      if (!transaction?.seriesId) {
        setScheduleMode('NONE');
        setEndDateYmd(null);
      }
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

  function handleSelectSchedule(mode: ScheduleMode) {
    setScheduleMode(mode);
    if (mode !== 'INSTALLMENT') {
      setEndDateYmd(null);
    }
  }

  async function submitWithScope(scope: TransactionSeriesScope) {
    setLocalError(null);

    const clientError = validateCreateTransactionClient(
      t,
      amountCents,
      isPaid,
      selectedAccountId,
      scheduleChanged ? scheduleMode : 'NONE',
      dateYmd,
      endDateYmd,
      selectedCard?.closingDay,
      selectedCard?.dueDay
    );
    if (clientError) {
      setLocalError(clientError);
      return;
    }

    const schedule = !scheduleChanged
      ? undefined
      : scheduleMode === 'INSTALLMENT' && endDateYmd
        ? { mode: 'INSTALLMENT' as const, endDate: endDateYmd }
        : scheduleMode === 'RECURRING'
          ? { mode: 'RECURRING' as const }
          : scheduleMode === 'NONE'
            ? { mode: 'NONE' as const }
            : undefined;

    const payload = {
      type,
      amount: amountCents,
      date: dateYmd,
      scope,
      ...(schedule ? { schedule } : {}),
      ...(description.trim() ? { description: description.trim() } : { description: null }),
      ...(type !== 'TRANSFER' && selectedCategoryId
        ? { categoryId: selectedCategoryId }
        : { categoryId: null }),
      ...(selectedAccountId ? { accountId: selectedAccountId } : { accountId: null }),
      ...(selectedCardId ? { cardId: selectedCardId } : { cardId: null })
    };

    const parsed = updateTransactionInputSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalError(translateCreateTransactionZodError(t, parsed.error));
      return;
    }

    mutate(
      {
        transactionId,
        input: parsed.data,
        ...(isPaid !== initialIsPaid ? { nextIsPaid: isPaid } : {})
      },
      {
        onSuccess: () => {
          navigation.goBack();
        }
      }
    );
  }

  async function handleSubmit() {
    if (scheduleChanged) {
      await submitWithScope('THIS_AND_FUTURE');
      return;
    }

    if (transaction?.seriesId) {
      Alert.alert(t('transactions.seriesScopeTitle'), undefined, [
        { text: t('transactions.seriesScopeCancel'), style: 'cancel' },
        {
          text: t('transactions.seriesScopeSingle'),
          onPress: () => {
            void submitWithScope('SINGLE');
          }
        },
        {
          text: t('transactions.seriesScopeFuture'),
          onPress: () => {
            void submitWithScope('THIS_AND_FUTURE');
          }
        }
      ]);
      return;
    }

    await submitWithScope('SINGLE');
  }

  function deleteWithScope(scope: TransactionSeriesScope) {
    setLocalError(null);
    deleteTransaction(
      { transactionId, scope },
      {
        onSuccess: () => {
          navigation.goBack();
        }
      }
    );
  }

  function confirmDelete() {
    if (transaction?.seriesId) {
      Alert.alert(t('transactions.seriesDeleteTitle'), t('transactions.seriesDeleteMessage'), [
        { text: t('transactions.seriesScopeCancel'), style: 'cancel' },
        {
          text: t('transactions.seriesScopeSingle'),
          style: 'destructive',
          onPress: () => deleteWithScope('SINGLE')
        },
        {
          text: t('transactions.seriesScopeFuture'),
          style: 'destructive',
          onPress: () => deleteWithScope('THIS_AND_FUTURE')
        }
      ]);
      return;
    }

    Alert.alert(t('transactions.deleteConfirmTitle'), t('transactions.deleteConfirmMessage'), [
      { text: t('transactions.deleteCancel'), style: 'cancel' },
      {
        text: t('transactions.deleteConfirm'),
        style: 'destructive',
        onPress: () => deleteWithScope('SINGLE')
      }
    ]);
  }

  if (transactionQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <Text style={[styles.notFound, { color: theme.colors.textSecondary }]}>
          {t('transactions.notFound')}
        </Text>
      </View>
    );
  }

  const isBusy = isPending || isDeleting;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        <TransactionTypeSegment
          theme={theme}
          selectedType={type ?? 'EXPENSE'}
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
          <>
            <TransactionScheduleSegment
              theme={theme}
              selected={scheduleMode}
              options={scheduleOptions}
              onSelect={handleSelectSchedule}
              label={t('transactions.scheduleLabel')}
            />
            {scheduleMode === 'INSTALLMENT' &&
            (scheduleChanged || !transaction.seriesId) ? (
              <>
                <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                  {selectedCard
                    ? t('transactions.scheduleInstallmentCardHint')
                    : t('transactions.scheduleInstallmentHint')}
                </Text>
                <TransactionDateField
                  theme={theme}
                  valueYmd={endDateYmd ?? dateYmd}
                  locale={i18n.language}
                  onChangeYmd={setEndDateYmd}
                  label={t('transactions.installmentEndDateLabel')}
                  minimumDateYmd={
                    selectedCard
                      ? `${formatYearMonth(getInvoicePaymentMonth(selectedCard.closingDay, selectedCard.dueDay, dateYmd))}-01`
                      : dateYmd
                  }
                />
                {cardInstallmentSummary ? (
                  <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                    {t('transactions.scheduleInstallmentCardSummary', {
                      count: cardInstallmentSummary.count,
                      first: cardInstallmentSummary.first,
                      last: cardInstallmentSummary.last
                    })}
                  </Text>
                ) : null}
                {!selectedCard && installmentCount !== null && installmentCount >= 2 ? (
                  <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                    {t('transactions.scheduleInstallmentSummary', { count: installmentCount })}
                  </Text>
                ) : null}
              </>
            ) : null}
            {scheduleMode === 'RECURRING' && scheduleChanged ? (
              <>
                <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                  {t('transactions.scheduleRecurringHint')}
                </Text>
                <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                  {t('transactions.scheduleRecurringSummary')}
                </Text>
              </>
            ) : null}
            {scheduleChanged && !transaction.seriesId && scheduleMode !== 'NONE' ? (
              <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
                {t('transactions.schedulePaidFirstOnlyHint')}
              </Text>
            ) : null}
          </>
        ) : null}

        {transaction.seriesId ? (
          <Text style={[styles.fieldHint, { color: theme.colors.textSecondary }]}>
            {transaction.seriesType === 'INSTALLMENT' &&
            transaction.occurrenceNumber &&
            transaction.seriesTotalOccurrences
              ? t('transactions.seriesInstallmentLabel', {
                  current: transaction.occurrenceNumber,
                  total: transaction.seriesTotalOccurrences
                })
              : t('transactions.seriesRecurringLabel')}
            {transaction.isProjected ? ` · ${t('transactions.projectedLabel')}` : ''}
          </Text>
        ) : null}

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
        ) : null}

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
          </View>
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
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.errorText, { color: theme.colors.danger }]}
          >
            {displayError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
            isBusy && styles.primaryButtonDisabled,
            pressed && !isBusy && styles.primaryButtonPressed
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.textOnPrimary }]}>
            {isPending ? t('transactions.updateLoading') : t('transactions.updateSubmit')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.dangerButton,
            { borderColor: theme.colors.danger },
            isBusy && styles.primaryButtonDisabled,
            pressed && !isBusy && styles.primaryButtonPressed
          ]}
        >
          <Text style={[styles.dangerButtonText, { color: theme.colors.danger }]}>
            {isDeleting ? t('transactions.deleteLoading') : t('transactions.deleteAction')}
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
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4
  },
  dangerButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1.5
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
  dangerButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notFound: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600'
  }
});
