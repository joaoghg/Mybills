import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AccountsSection } from '@/features/wallet/components/accounts-section';
import { InvoiceCard } from '@/features/wallet/components/invoice-card';
import { PhysicalCardsCarousel } from '@/features/wallet/components/physical-cards-carousel';
import { WalletContentSkeleton } from '@/features/wallet/components/wallet-content-skeleton';
import { useWalletDashboard } from '@/features/wallet/hooks/use-wallet-dashboard';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import { AppScreenHeader } from '@/shared/components/app-screen-header';
import { InvoiceDetailSheet } from '@/shared/components/invoice-detail-sheet';
import { firstNameFromUserName, useCurrentUser } from '@/shared/hooks/use-current-user';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export function WalletScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.language;
  const userQuery = useCurrentUser();
  const dashboard = useWalletDashboard();
  const [invoiceSheetVisible, setInvoiceSheetVisible] = useState(false);

  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  const accountRows = dashboard.accounts;

  const isLoading = dashboard.isLoading || userQuery.isPending;
  const isError = dashboard.isError || userQuery.isError;

  const refetchAll = async () => {
    await Promise.all([dashboard.refetchAll(), userQuery.refetch()]);
  };

  const openInvoiceSheet = () => setInvoiceSheetVisible(true);

  const firstName = firstNameFromUserName(userQuery.data?.name);
  const greeting =
    firstName.length > 0 ? t('home.greeting', { name: firstName }) : undefined;

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
          <WalletContentSkeleton theme={theme} />
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
              {t('wallet.loadError')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetchAll()}
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
              onAccountPress={(accountId) => navigateRoot('EditAccount', { accountId })}
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
              onEmptyActionPress={() => navigateRoot('AddCreditCard')}
              onEditCard={(cardId) => navigateRoot('EditCreditCard', { cardId })}
              editCardLabel={t('wallet.editCard')}
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
                onPress={openInvoiceSheet}
                onPayPress={openInvoiceSheet}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <InvoiceDetailSheet
        cardId={dashboard.selectedCardId}
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
