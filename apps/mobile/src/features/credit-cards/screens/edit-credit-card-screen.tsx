import { updateCreditCardInputSchema } from '@mybills/dtos';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useTheme } from '@/core/theme';
import { useAccounts } from '@/features/accounts/hooks/use-accounts';
import { useCreditCards } from '@/features/credit-cards/hooks/use-credit-cards';
import { useDeleteCreditCard } from '@/features/credit-cards/hooks/use-delete-credit-card';
import { useUpdateCreditCard } from '@/features/credit-cards/hooks/use-update-credit-card';
import { translateCreateCreditCardError } from '@/features/credit-cards/utils/create-credit-card-error';
import { translateCreateCreditCardZodError } from '@/features/credit-cards/utils/create-credit-card-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCreditCard'>;

function parseDayInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function EditCreditCardScreen({ navigation, route }: Props) {
  const { cardId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { data: cards = [], isLoading } = useCreditCards();
  const { data: accounts = [] } = useAccounts();
  const card = cards.find((item) => item.id === cardId);
  const { mutate, isPending, isError, error } = useUpdateCreditCard();
  const {
    mutate: deleteCard,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError
  } = useDeleteCreditCard();

  const [name, setName] = useState('');
  const [limitCents, setLimitCents] = useState(0);
  const [closingDayText, setClosingDayText] = useState('');
  const [dueDayText, setDueDayText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!card) {
      return;
    }
    setName(card.name);
    setLimitCents(card.limit);
    setClosingDayText(String(card.closingDay));
    setDueDayText(String(card.dueDay));
    setSelectedAccountId(card.accountId);
  }, [card]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('creditCards.editTitle') });
  }, [navigation, t]);

  const remoteMessage =
    isError && error ? translateCreateCreditCardError(error, t) : null;
  const deleteRemoteMessage =
    isDeleteError && deleteError ? translateCreateCreditCardError(deleteError, t) : null;
  const displayError = localError ?? remoteMessage ?? deleteRemoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const payload = {
      accountId: selectedAccountId,
      name,
      limit: limitCents,
      closingDay: parseDayInput(closingDayText),
      dueDay: parseDayInput(dueDayText)
    };

    const parsed = updateCreditCardInputSchema.safeParse(payload);
    if (!parsed.success) {
      setLocalError(translateCreateCreditCardZodError(t, parsed.error));
      return;
    }

    mutate(
      { cardId, input: parsed.data },
      {
        onSuccess: () => {
          navigation.goBack();
        }
      }
    );
  }

  function confirmDelete() {
    if (!card) {
      return;
    }

    Alert.alert(
      t('creditCards.deleteConfirmTitle'),
      t('creditCards.deleteConfirmMessage', { name: card.name }),
      [
        { text: t('creditCards.deleteCancel'), style: 'cancel' },
        {
          text: t('creditCards.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setLocalError(null);
            deleteCard(cardId, {
              onSuccess: () => {
                navigation.goBack();
              }
            });
          }
        }
      ]
    );
  }

  if (isLoading && !card) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <Text style={[styles.notFound, { color: theme.colors.textSecondary }]}>
          {t('creditCards.notFound')}
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
        <InputField
          theme={theme}
          label={t('creditCards.closingDayLabel')}
          placeholder={t('creditCards.closingDayPlaceholder')}
          value={closingDayText}
          onChangeText={setClosingDayText}
          keyboardType="number-pad"
        />
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
            style={[styles.errorText, { color: theme.colors.danger }]}
          >
            {displayError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
            isBusy && styles.primaryButtonDisabled,
            pressed && !isBusy && styles.primaryButtonPressed
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.textOnPrimary }]}>
            {isPending ? t('creditCards.updateLoading') : t('creditCards.updateSubmit')}
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
            {isDeleting ? t('creditCards.deleteLoading') : t('creditCards.deleteAction')}
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
