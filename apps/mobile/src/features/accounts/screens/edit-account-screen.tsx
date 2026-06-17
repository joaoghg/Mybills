import { updateAccountInputSchema } from '@mybills/dtos';
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
import { useDeleteAccount } from '@/features/accounts/hooks/use-delete-account';
import { useUpdateAccount } from '@/features/accounts/hooks/use-update-account';
import { translateCreateAccountError } from '@/features/accounts/utils/create-account-error';
import { translateCreateAccountZodError } from '@/features/accounts/utils/create-account-validation';
import type { RootStackParamList } from '@/navigation/types';
import { InputField } from '@/shared/components/input-field';
import { MoneyInputField } from '@/shared/components/money-input-field';

type Props = NativeStackScreenProps<RootStackParamList, 'EditAccount'>;

export function EditAccountScreen({ navigation, route }: Props) {
  const { accountId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useAccounts();
  const account = accounts.find((item) => item.id === accountId);
  const { mutate, isPending, isError, error } = useUpdateAccount();
  const {
    mutate: deleteAccount,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError
  } = useDeleteAccount();

  const [name, setName] = useState('');
  const [balanceCents, setBalanceCents] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      return;
    }
    setName(account.name);
    setBalanceCents(account.balance);
  }, [account]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('accounts.editTitle') });
  }, [navigation, t]);

  const remoteMessage =
    isError && error ? translateCreateAccountError(error, t) : null;
  const deleteRemoteMessage =
    isDeleteError && deleteError ? translateCreateAccountError(deleteError, t) : null;
  const displayError = localError ?? remoteMessage ?? deleteRemoteMessage;

  function handleSubmit() {
    setLocalError(null);

    const parsed = updateAccountInputSchema.safeParse({
      name,
      balance: balanceCents
    });
    if (!parsed.success) {
      setLocalError(translateCreateAccountZodError(t, parsed.error));
      return;
    }

    mutate(
      { accountId, input: parsed.data },
      {
        onSuccess: () => {
          navigation.goBack();
        }
      }
    );
  }

  function confirmDelete() {
    if (!account) {
      return;
    }

    Alert.alert(
      t('accounts.deleteConfirmTitle'),
      t('accounts.deleteConfirmMessage', { name: account.name }),
      [
        { text: t('accounts.deleteCancel'), style: 'cancel' },
        {
          text: t('accounts.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setLocalError(null);
            deleteAccount(accountId, {
              onSuccess: () => {
                navigation.goBack();
              }
            });
          }
        }
      ]
    );
  }

  if (isLoading && !account) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, padding: 24 }]}>
        <Text style={[styles.notFound, { color: theme.colors.textSecondary }]}>
          {t('accounts.notFound')}
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
          label={t('accounts.nameLabel')}
          placeholder={t('accounts.namePlaceholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <MoneyInputField
          theme={theme}
          label={t('accounts.balanceEditLabel')}
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
            {isPending ? t('accounts.updateLoading') : t('accounts.updateSubmit')}
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
            {isDeleting ? t('accounts.deleteLoading') : t('accounts.deleteAction')}
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
