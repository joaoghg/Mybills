import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { CreditCardSummaryCard } from '@/features/home/components/credit-card-summary-card';
import { GeneralBalanceCard } from '@/features/home/components/general-balance-card';
import { HomeContentSkeleton } from '@/features/home/components/home-content-skeleton';
import { useHomeDashboard } from '@/features/home/hooks/use-home-dashboard';
import type { AppTabParamList } from '@/navigation/types';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import { AppScreenHeader } from '@/shared/components/app-screen-header';
import { InvoiceDetailSheet } from '@/shared/components/invoice-detail-sheet';
import { RecentTransactionsSection } from '@/shared/components/recent-transactions-section';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';
import { firstNameFromUserName, useCurrentUser } from '@/shared/hooks/use-current-user';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const locale = i18n.language;
  const userQuery = useCurrentUser();
  const [invoiceSheetVisible, setInvoiceSheetVisible] = useState(false);

  const timeLabels = useMemo(
    () => ({
      todayAt: (time: string) => t('home.todayAt', { time }),
      yesterdayAt: (time: string) => t('home.yesterdayAt', { time })
    }),
    [t]
  );

  const dashboard = useHomeDashboard(locale, timeLabels, t('transactions.types.transfer'));
  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  function handleTransactionPress(row: RecentTransactionRow) {
    if (row.transferGroupId) {
      navigateRoot('EditTransfer', { transferGroupId: row.transferGroupId });
      return;
    }

    navigateRoot('EditTransaction', { transactionId: row.id });
  }

  const isLoading = dashboard.isLoading || userQuery.isPending;
  const isError = dashboard.isError || userQuery.isError;

  const refetchAll = async () => {
    await Promise.all([dashboard.refetchAll(), userQuery.refetch()]);
  };

  const firstName = firstNameFromUserName(userQuery.data?.name);
  const greeting =
    firstName.length > 0 ? t('home.greeting', { name: firstName }) : undefined;

  const recentRows = dashboard.recent.map((row) => ({
    ...row,
    merchant: row.merchant.trim() ? row.merchant : t('home.noDescription')
  }));

  const scrollContent = {
    paddingHorizontal: 20,
    paddingTop: insets.top + 12,
    paddingBottom: insets.bottom + 32
  };

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          theme={theme}
          greeting={greeting}
          isLoadingGreeting={userQuery.isPending}
        />

        {isLoading ? (
          <HomeContentSkeleton theme={theme} />
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
              {t('home.loadError')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetchAll()}
              style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.retryLabel, { color: theme.colors.textOnPrimary }]}>
                {t('home.retry')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <GeneralBalanceCard
              theme={theme}
              label={t('home.generalBalance')}
              balanceMajor={dashboard.totalBalanceMajor}
              formatCurrency={formatMoney}
            />
            <CreditCardSummaryCard
              theme={theme}
              card={dashboard.creditCard}
              title={t('home.creditCard')}
              dueOnLabel={t('home.dueOn', {
                date: dashboard.creditCard?.dueDateLabel ?? ''
              })}
              statusOpenLabel={t('home.invoiceStatusOpen')}
              currentInvoiceLabel={t('home.currentInvoice')}
              availableLimitLabel={t('home.availableLimit')}
              emptyLabel={t('home.emptyCards')}
              formatCurrency={formatMoney}
              canCycleCards={dashboard.canCycleCards}
              onCycleCard={dashboard.selectNextCard}
              onPress={
                dashboard.creditCard
                  ? () => setInvoiceSheetVisible(true)
                  : undefined
              }
            />
            <RecentTransactionsSection
              theme={theme}
              sectionTitle={t('home.recentSection')}
              seeAllLabel={t('home.seeAll')}
              transactions={recentRows}
              emptyLabel={t('home.emptyTransactions')}
              onSeeAllPress={() => navigation.navigate('HistoryTab')}
              onTransactionPress={handleTransactionPress}
              formatCurrency={formatMoney}
            />
          </>
        )}
      </ScrollView>

      <InvoiceDetailSheet
        cardId={dashboard.creditCard?.cardId ?? null}
        visible={invoiceSheetVisible}
        onClose={() => setInvoiceSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  errorBox: {
    gap: 16,
    paddingVertical: 24
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600'
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
