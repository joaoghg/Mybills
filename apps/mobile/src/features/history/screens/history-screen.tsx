import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { useTransactionRows } from '@/features/transactions/hooks/use-transaction-rows';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import { AppScreenHeader } from '@/shared/components/app-screen-header';
import { TransactionListItem } from '@/shared/components/transaction-list-item';
import { firstNameFromUserName, useCurrentUser } from '@/shared/hooks/use-current-user';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export function HistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const userQuery = useCurrentUser();
  const locale = i18n.language;

  const timeLabels = useMemo(
    () => ({
      todayAt: (time: string) => t('home.todayAt', { time }),
      yesterdayAt: (time: string) => t('home.yesterdayAt', { time })
    }),
    [t]
  );

  const { rows, isLoading, isError, isRefetching, refetch } = useTransactionRows(locale, timeLabels);
  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  const firstName = firstNameFromUserName(userQuery.data?.name);
  const greeting =
    firstName.length > 0 ? t('home.greeting', { name: firstName }) : undefined;

  const displayRows = rows.map((row) => ({
    ...row,
    merchant: row.merchant.trim() ? row.merchant : t('home.noDescription')
  }));

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppScreenHeader
        theme={theme}
        greeting={greeting}
        isLoadingGreeting={userQuery.isPending}
      />
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('history.title')}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top + 12 }
        ]}
      >
        {listHeader}
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 32
          }
        ]}
      >
        {listHeader}
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
            {t('history.error')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.textOnPrimary }]}>
              {t('history.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.listContent,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }
      ]}
      data={displayRows}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={theme.colors.primary}
        />
      }
      renderItem={({ item }) => (
        <TransactionListItem theme={theme} transaction={item} formatCurrency={formatMoney} />
      )}
      ListEmptyComponent={
        <View style={styles.emptyBlock}>
          <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
            {t('history.empty')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateRoot('AddTransaction')}
            style={[styles.emptyCta, { borderColor: theme.colors.primary }]}
          >
            <Text style={[styles.emptyCtaLabel, { color: theme.colors.primary }]}>
              {t('history.emptyAction')}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1
  },
  headerBlock: {
    gap: 8,
    marginBottom: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '800'
  },
  separator: {
    height: 10
  },
  loader: {
    marginTop: 24
  },
  errorBox: {
    gap: 12,
    paddingVertical: 8
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  emptyBlock: {
    gap: 12,
    paddingVertical: 16
  },
  empty: {
    fontSize: 14
  },
  emptyCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5
  },
  emptyCtaLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
