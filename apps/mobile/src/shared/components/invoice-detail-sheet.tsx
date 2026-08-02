import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AccountPickerSheet } from '@/shared/components/account-picker-sheet';
import { TransactionListItem } from '@/shared/components/transaction-list-item';
import { useInvoiceDetail } from '@/shared/hooks/use-invoice-detail';
import type { TransactionDateSection } from '@/shared/lib/group-transactions-by-date';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export type InvoiceDetailSheetProps = {
  cardId: string | null;
  visible: boolean;
  onClose: () => void;
};

type InvoiceDetailSheetViewProps = {
  theme: ReturnType<typeof useTheme>['theme'];
  cardName: string;
  cycleLabel: string;
  cycleCaption: string;
  totalLabel: string;
  totalFormatted: string;
  overdueLabel: string | null;
  previousCycleLabel: string;
  nextCycleLabel: string;
  emptyLabel: string;
  cannotPayYetLabel: string;
  payLabel: string;
  loadErrorLabel: string;
  retryLabel: string;
  paidSuccessLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canPay: boolean;
  showCannotPayHint: boolean;
  isLoading: boolean;
  isError: boolean;
  isPaying: boolean;
  payError: string | null;
  paySuccess: boolean;
  sections: TransactionDateSection[];
  bottomInset: number;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onPreviousCycle: () => void;
  onNextCycle: () => void;
  onRetry: () => void;
  onPayPress: () => void;
};

function InvoiceDetailSheetView({
  theme,
  cardName,
  cycleLabel,
  cycleCaption,
  totalLabel,
  totalFormatted,
  overdueLabel,
  previousCycleLabel,
  nextCycleLabel,
  emptyLabel,
  cannotPayYetLabel,
  payLabel,
  loadErrorLabel,
  retryLabel,
  paidSuccessLabel,
  canGoPrevious,
  canGoNext,
  canPay,
  showCannotPayHint,
  isLoading,
  isError,
  isPaying,
  payError,
  paySuccess,
  sections,
  bottomInset,
  formatCurrency,
  onClose,
  onPreviousCycle,
  onNextCycle,
  onRetry,
  onPayPress
}: InvoiceDetailSheetViewProps) {
  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: bottomInset + 16
        }
      ]}
    >
      <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.cardName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {cardName}
          </Text>
          <Text style={[styles.cycleCaption, { color: theme.colors.textSecondary }]}>
            {cycleCaption}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.cycleNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousCycleLabel}
          disabled={!canGoPrevious}
          onPress={onPreviousCycle}
          style={({ pressed }) => [
            styles.navBtn,
            (!canGoPrevious || pressed) && styles.pressed,
            !canGoPrevious && styles.navDisabled
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.cycleLabel, { color: theme.colors.textPrimary }]}>{cycleLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextCycleLabel}
          disabled={!canGoNext}
          onPress={onNextCycle}
          style={({ pressed }) => [
            styles.navBtn,
            (!canGoNext || pressed) && styles.pressed,
            !canGoNext && styles.navDisabled
          ]}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View
        style={[
          styles.totalCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }
        ]}
      >
        <View style={styles.totalTop}>
          <Text style={[styles.totalKicker, { color: theme.colors.textSecondary }]}>
            {totalLabel}
          </Text>
          {overdueLabel ? (
            <View style={[styles.overdueBadge, { backgroundColor: `${theme.colors.danger}22` }]}>
              <Text style={[styles.overdueText, { color: theme.colors.danger }]}>
                {overdueLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.totalAmount, { color: theme.colors.textPrimary }]}>
          {totalFormatted}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
            {loadErrorLabel}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.textOnPrimary }]}>
              {retryLabel}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
          ) : (
            sections.map((section) => (
              <View key={section.dateYmd} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                    {section.headerLabel}
                  </Text>
                  <Text
                    style={[
                      styles.sectionTotal,
                      {
                        color:
                          section.dailyNetMajor < 0
                            ? theme.colors.danger
                            : theme.colors.textSecondary
                      }
                    ]}
                  >
                    {formatCurrency(section.dailyNetMajor)}
                  </Text>
                </View>
                {section.rows.map((row) => (
                  <View key={row.id} style={styles.rowWrap}>
                    <TransactionListItem
                      theme={theme}
                      transaction={row}
                      subtitle={row.subtitle}
                      formatCurrency={formatCurrency}
                    />
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {paySuccess ? (
        <Text style={[styles.feedbackSuccess, { color: theme.colors.positive }]}>
          {paidSuccessLabel}
        </Text>
      ) : null}
      {payError ? (
        <Text style={[styles.feedbackError, { color: theme.colors.danger }]}>{payError}</Text>
      ) : null}
      {showCannotPayHint ? (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {cannotPayYetLabel}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canPay || isPaying || isLoading || isError}
        onPress={onPayPress}
        style={({ pressed }) => [
          styles.payBtn,
          {
            backgroundColor: canPay ? theme.colors.primary : theme.colors.surfaceAlt,
            opacity: pressed && canPay ? 0.92 : canPay ? 1 : 0.65
          }
        ]}
      >
        {isPaying ? (
          <ActivityIndicator color={theme.colors.textOnPrimary} />
        ) : (
          <Text
            style={[
              styles.payLabel,
              {
                color: canPay ? theme.colors.textOnPrimary : theme.colors.textSecondary
              }
            ]}
          >
            {payLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export function InvoiceDetailSheet({ cardId, visible, onClose }: InvoiceDetailSheetProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.language;
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);

  const timeLabels = useMemo(
    () => ({
      today: t('home.today'),
      yesterday: t('home.yesterday')
    }),
    [t]
  );

  const invoice = useInvoiceDetail(cardId, visible, locale, timeLabels, t);
  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  function handlePayPress() {
    if (!invoice.canPay) return;
    if (invoice.needsAccountPicker) {
      setAccountPickerVisible(true);
      return;
    }
    void invoice.payInvoice();
  }

  function handleAccountSelect(accountId: string) {
    void invoice.payInvoice(accountId);
  }

  const showCannotPayHint =
    Boolean(invoice.hasUnpaid) && !invoice.canPay && !invoice.isLoading && !invoice.isError;

  const payErrorMessage =
    invoice.payError === 'account_required'
      ? t('wallet.selectAccount')
      : invoice.payError;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={styles.sheetWrap}
            onPress={(event) => event.stopPropagation()}
          >
            <InvoiceDetailSheetView
              theme={theme}
              cardName={invoice.card?.name ?? ''}
              cycleLabel={invoice.cycleLabel}
              cycleCaption={t('wallet.cycleLabel')}
              totalLabel={
                invoice.isOpenCycle
                  ? t('wallet.currentInvoiceLabel')
                  : t('wallet.cycleLabel').toUpperCase()
              }
              totalFormatted={formatMoney(invoice.totalUnpaidMajor)}
              overdueLabel={invoice.isOverdue ? t('wallet.overdue') : null}
              previousCycleLabel={t('wallet.previousCycle')}
              nextCycleLabel={t('wallet.nextCycle')}
              emptyLabel={t('wallet.emptyInvoice')}
              cannotPayYetLabel={t('wallet.cannotPayYet')}
              payLabel={t('wallet.payInvoice')}
              loadErrorLabel={t('wallet.loadError')}
              retryLabel={t('wallet.retry')}
              paidSuccessLabel={t('wallet.invoicePaidSuccess')}
              canGoPrevious={invoice.canGoPrevious}
              canGoNext={invoice.canGoNext}
              canPay={invoice.canPay}
              showCannotPayHint={showCannotPayHint}
              isLoading={invoice.isLoading}
              isError={invoice.isError}
              isPaying={invoice.isPaying}
              payError={payErrorMessage}
              paySuccess={invoice.paySuccess}
              sections={invoice.sections}
              bottomInset={insets.bottom}
              formatCurrency={formatMoney}
              onClose={onClose}
              onPreviousCycle={invoice.goToPreviousCycle}
              onNextCycle={invoice.goToNextCycle}
              onRetry={() => void invoice.refetch()}
              onPayPress={handlePayPress}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <AccountPickerSheet
        theme={theme}
        visible={accountPickerVisible}
        title={t('wallet.selectAccount')}
        accounts={invoice.accounts}
        emptyLabel={t('wallet.emptyAccounts')}
        formatCurrency={formatMoney}
        onClose={() => setAccountPickerVisible(false)}
        onSelect={handleAccountSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  sheetWrap: {
    maxHeight: '92%'
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    minHeight: 420
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    marginBottom: 4
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800'
  },
  cycleCaption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cycleNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navDisabled: {
    opacity: 0.35
  },
  cycleLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700'
  },
  totalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  totalKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  overdueBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  list: {
    maxHeight: 320
  },
  listContent: {
    paddingBottom: 8,
    gap: 4
  },
  section: {
    marginBottom: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 8
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '700'
  },
  rowWrap: {
    marginBottom: 8
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 28
  },
  loader: {
    marginVertical: 40
  },
  errorBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center'
  },
  feedbackSuccess: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  feedbackError: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  payBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 14,
    marginTop: 4
  },
  payLabel: {
    fontSize: 16,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.9
  }
});
