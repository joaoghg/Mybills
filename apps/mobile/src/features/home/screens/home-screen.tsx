import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/core/theme';
import { AccountsSection } from '@/features/home/components/accounts-section';
import { HomeContentSkeleton } from '@/features/home/components/home-content-skeleton';
import { HomeHeader } from '@/features/home/components/home-header';
import { InvoiceCard } from '@/features/home/components/invoice-card';
import { PhysicalCardsCarousel } from '@/features/home/components/physical-cards-carousel';
import { RecentTransactionsSection } from '@/features/home/components/recent-transactions-section';
import { useHomeDashboard } from '@/features/home/hooks/use-home-dashboard';
import type { AppTabParamList } from '@/navigation/types';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

type HomeTabNav = BottomTabNavigationProp<AppTabParamList, 'HomeTab'>;

export function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeTabNav>();
  const locale = i18n.language;
  const dashboard = useHomeDashboard(locale);

  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  const accountRows = dashboard.account ? [dashboard.account] : [];
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
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader
        theme={theme}
        brandName={t('home.brandName')}
        notificationsLabel={t('home.notificationsHint')}
        profileLabel={t('home.profileHint')}
      />

      {dashboard.isLoading ? (
        <HomeContentSkeleton theme={theme} />
      ) : dashboard.isError ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
            {t('home.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void dashboard.refetchAll()}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.textOnPrimary }]}>
              {t('home.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <AccountsSection
            theme={theme}
            sectionTitle={t('home.accountsSection')}
            headerActionLabel={t('home.seeAllAccounts')}
            onHeaderActionPress={() => navigation.navigate('WalletTab')}
            accounts={accountRows}
            formatCurrency={formatMoney}
            emptyLabel={t('home.emptyAccounts')}
            emptyActionLabel={t('home.addAccount')}
            onEmptyActionPress={() => {
              /* placeholder: add account flow */
            }}
          />
          <PhysicalCardsCarousel
            theme={theme}
            sectionTitle={t('home.physicalCards')}
            headerActionLabel={t('home.seeAllAccounts')}
            onHeaderActionPress={() => navigation.navigate('WalletTab')}
            cards={dashboard.physicalCards}
            selectedCardId={dashboard.selectedCardId}
            onSelectCard={dashboard.setSelectedCardId}
            availableLimitLabel={t('home.availableLimit')}
            contactlessLabel={t('home.contactlessHint')}
            formatCurrency={formatMoney}
            emptyLabel={t('home.emptyCards')}
            emptyActionLabel={t('home.addCard')}
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
              invoiceLabel={t('home.currentInvoiceLabel')}
              dueLabel={t('home.dueInDays', { days: dashboard.invoice.dueInDays })}
              payLabel={t('home.payInvoice')}
              formatCurrency={formatMoney}
            />
          ) : null}
          <RecentTransactionsSection
            theme={theme}
            sectionTitle={t('home.recentSection')}
            seeAllLabel={t('home.seeAll')}
            transactions={recentRows}
            emptyLabel={t('home.emptyTransactions')}
            emptyActionLabel={t('home.addTransaction')}
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
