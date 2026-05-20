import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AccountsSection } from '@/features/wallet/components/accounts-section';
import { InvoiceCard } from '@/features/wallet/components/invoice-card';
import { PhysicalCardsCarousel } from '@/features/wallet/components/physical-cards-carousel';
import { RecentTransactionsSection } from '@/features/wallet/components/recent-transactions-section';
import { WalletContentSkeleton } from '@/features/wallet/components/wallet-content-skeleton';
import { WalletHeader } from '@/features/wallet/components/wallet-header';
import { useWalletDashboard } from '@/features/wallet/hooks/use-wallet-dashboard';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export function WalletScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.language;
  const dashboard = useWalletDashboard(locale);

  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  const accountRows = dashboard.account ? [dashboard.account] : [];
  const recentRows = dashboard.recent.map((row) => ({
    ...row,
    merchant: row.merchant.trim() ? row.merchant : t('wallet.noDescription')
  }));

  const scrollContent = {
    paddingHorizontal: 20,
    paddingTop: insets.top + 12,
    paddingBottom: insets.bottom + 32
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <WalletHeader theme={theme} brandName={t('wallet.brandName')} />

      {dashboard.isLoading ? (
        <WalletContentSkeleton theme={theme} />
      ) : dashboard.isError ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
            {t('wallet.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void dashboard.refetchAll()}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.textOnPrimary }]}>
              {t('wallet.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <AccountsSection
            theme={theme}
            sectionTitle={t('wallet.accountsSection')}
            accounts={accountRows}
            formatCurrency={formatMoney}
            emptyLabel={t('wallet.emptyAccounts')}
            emptyActionLabel={t('wallet.addAccount')}
            onEmptyActionPress={() => navigateRoot('AddAccount')}
          />
          <PhysicalCardsCarousel
            theme={theme}
            sectionTitle={t('wallet.physicalCards')}
            cards={dashboard.physicalCards}
            selectedCardId={dashboard.selectedCardId}
            onSelectCard={dashboard.setSelectedCardId}
            availableLimitLabel={t('wallet.availableLimit')}
            contactlessLabel={t('wallet.contactlessHint')}
            formatCurrency={formatMoney}
            emptyLabel={t('wallet.emptyCards')}
            emptyActionLabel={t('wallet.addCard')}
            onEmptyActionPress={() => {
              /* placeholder: add card flow */
            }}
          />
          {dashboard.invoice ? (
            <InvoiceCard
              theme={theme}
              invoice={{
                totalMajor: dashboard.invoice.totalMajor,
                dueInDays: dashboard.invoice.dueInDays,
                cardName: dashboard.invoice.cardName
              }}
              invoiceLabel={t('wallet.currentInvoiceLabel')}
              dueLabel={t('wallet.dueInDays', { days: dashboard.invoice.dueInDays })}
              payLabel={t('wallet.payInvoice')}
              formatCurrency={formatMoney}
            />
          ) : null}
          <RecentTransactionsSection
            theme={theme}
            sectionTitle={t('wallet.recentSection')}
            seeAllLabel={t('wallet.seeAll')}
            transactions={recentRows}
            emptyLabel={t('wallet.emptyTransactions')}
            emptyActionLabel={t('wallet.addTransaction')}
            onEmptyActionPress={() => {
              /* placeholder: add transaction flow */
            }}
            formatCurrency={formatMoney}
          />
        </>
      )}
    </ScrollView>
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
