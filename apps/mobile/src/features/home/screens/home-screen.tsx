import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AccountsSection } from '@/features/home/components/accounts-section';
import { HomeHeader } from '@/features/home/components/home-header';
import { InvoiceCard } from '@/features/home/components/invoice-card';
import { PhysicalCardsCarousel } from '@/features/home/components/physical-cards-carousel';
import { RecentTransactionsSection } from '@/features/home/components/recent-transactions-section';
import { useHomeDashboard } from '@/features/home/hooks/use-home-dashboard';
import { formatCurrencyValue } from '@/shared/utils/format-currency';
import { formatDecimalValue } from '@/shared/utils/format-number';

export function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.language;
  const dashboard = useHomeDashboard();

  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 32
      }}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader
        theme={theme}
        brandName={t('home.brandName')}
        notificationsLabel={t('home.notificationsHint')}
        profileLabel={t('home.profileHint')}
      />
      <AccountsSection
        theme={theme}
        sectionTitle={t('home.accountsSection')}
        newAccountLabel={t('home.newAccount')}
        accounts={dashboard.accounts}
        formatCurrency={formatMoney}
        accountTitle={(id) => t(`home.mockAccounts.${id}.title`)}
        accountSubtitle={(id) => t(`home.mockAccounts.${id}.subtitle`)}
        formatPercentLine={(account) =>
          t('home.percentThisMonth', {
            value: formatDecimalValue(account.percentChange, locale)
          })
        }
      />
      <PhysicalCardsCarousel
        theme={theme}
        sectionTitle={t('home.physicalCards')}
        cards={dashboard.physicalCards}
        availableLimitLabel={t('home.availableLimit')}
        premiumLabel={t('home.premiumTag')}
        contactlessLabel={t('home.contactlessHint')}
        formatCurrency={formatMoney}
      />
      <InvoiceCard
        theme={theme}
        invoice={dashboard.invoice}
        invoiceLabel={t('home.currentInvoiceLabel')}
        dueLabel={t('home.dueInDays', { days: dashboard.invoice.dueInDays })}
        payLabel={t('home.payInvoice')}
        formatCurrency={formatMoney}
      />
      <RecentTransactionsSection
        theme={theme}
        sectionTitle={t('home.recentSection')}
        seeAllLabel={t('home.seeAll')}
        transactions={dashboard.recent}
        merchantLabel={(categoryId) => t(`home.mockTransactions.${categoryId}`)}
        timeLabel={(rowKey) => t(`home.mockTransactionsTimes.${rowKey}`)}
        formatCurrency={formatMoney}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  }
});
