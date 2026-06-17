import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { HistoryCategoryPickerSheet } from '@/features/history/components/history-category-picker-sheet';
import { HistoryDateSectionHeader } from '@/features/history/components/history-date-section-header';
import { HistoryFilterBar } from '@/features/history/components/history-filter-bar';
import { HistoryFiltersSheet } from '@/features/history/components/history-filters-sheet';
import { HistoryMonthNavigator } from '@/features/history/components/history-month-navigator';
import { HistorySearchBar } from '@/features/history/components/history-search-bar';
import { HistoryTypePickerSheet } from '@/features/history/components/history-type-picker-sheet';
import { useTransactionHistory } from '@/features/history/hooks/use-transaction-history';
import type { TransactionDateSection } from '@/features/history/lib/group-transactions-by-date';
import { navigateRoot } from '@/navigation/root-navigation-ref';
import { AppScreenHeader } from '@/shared/components/app-screen-header';
import { TransactionListItem } from '@/shared/components/transaction-list-item';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';
import { formatCurrencyValue } from '@/shared/utils/format-currency';

export function HistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = i18n.language;

  const timeLabels = useMemo(
    () => ({
      todayAt: (time: string) => t('home.todayAt', { time }),
      yesterdayAt: (time: string) => t('home.yesterdayAt', { time })
    }),
    [t]
  );

  const history = useTransactionHistory(locale, timeLabels, t);
  const formatMoney = (amount: number) => formatCurrencyValue(amount, locale);

  function handleTransactionPress(row: RecentTransactionRow) {
    if (row.transferGroupId) {
      navigateRoot('EditTransfer', { transferGroupId: row.transferGroupId });
      return;
    }

    navigateRoot('EditTransaction', { transactionId: row.id });
  }

  const [filtersSheetVisible, setFiltersSheetVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);

  const typeOptions = useMemo(
    () => [
      { value: null, label: t('history.typeAll') },
      { value: 'INCOME' as const, label: t('history.typeIncome') },
      { value: 'EXPENSE' as const, label: t('history.typeExpense') }
    ],
    [t]
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppScreenHeader theme={theme} brandTitle={t('history.brandTitle')} />
      <HistoryMonthNavigator
        theme={theme}
        locale={locale}
        monthTitle={history.monthTitle}
        monthlyHistoryLabel={t('history.monthlyHistory')}
        selectedMonth={history.filters.selectedMonth}
        selectedYear={history.filters.selectedYear}
        onPrevious={history.goToPreviousMonth}
        onNext={history.goToNextMonth}
        onSelectMonth={history.selectMonthYear}
      />
      <HistorySearchBar
        theme={theme}
        value={history.filters.search}
        placeholder={t('history.searchPlaceholder')}
        onChangeText={history.setSearch}
      />
      <HistoryFilterBar
        theme={theme}
        buttons={[
          {
            key: 'filters',
            label: t('history.filters'),
            active: history.hasActiveAdvancedFilters || history.filters.includeTransfer,
            onPress: () => setFiltersSheetVisible(true)
          },
          {
            key: 'category',
            label: t('history.category'),
            active: history.filters.categoryId !== null,
            onPress: () => setCategorySheetVisible(true)
          },
          {
            key: 'type',
            label: t('history.type'),
            active: history.filters.type !== null,
            onPress: () => setTypeSheetVisible(true)
          }
        ]}
      />
    </View>
  );

  const renderSectionHeader = ({ section }: { section: TransactionDateSection }) => (
    <HistoryDateSectionHeader
      theme={theme}
      label={section.headerLabel}
      dailyNetMajor={section.dailyNetMajor}
      dailyTotalLabel={formatMoney(section.dailyNetMajor)}
    />
  );

  const renderItem = ({ item }: { item: TransactionDateSection['rows'][number] }) => (
    <TransactionListItem
      theme={theme}
      transaction={{
        ...item,
        merchant: item.merchant.trim() ? item.merchant : t('home.noDescription')
      }}
      subtitle={item.subtitle}
      formatCurrency={formatMoney}
      onPress={() => handleTransactionPress(item)}
    />
  );

  const emptyMessage = history.hasActiveAdvancedFilters ? t('history.emptyFiltered') : t('history.empty');

  if (history.isLoading) {
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

  if (history.isError) {
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
            onPress={() => void history.refetch()}
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
    <>
      <SectionList
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }
        ]}
        sections={history.sections.map((section) => ({
          ...section,
          data: section.rows
        }))}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching}
            onRefresh={() => void history.refetch()}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyMessage}</Text>
            {!history.hasActiveAdvancedFilters ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateRoot('AddTransaction')}
                style={[styles.emptyCta, { borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.emptyCtaLabel, { color: theme.colors.primary }]}>
                  {t('history.emptyAction')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <HistoryFiltersSheet
        theme={theme}
        visible={filtersSheetVisible}
        includeTransfersLabel={t('history.includeTransfers')}
        activeFiltersLabel={t('history.activeFilters')}
        clearFiltersLabel={t('history.clearFilters')}
        includeTransfer={history.filters.includeTransfer}
        hasActiveFilters={history.hasActiveAdvancedFilters}
        onClose={() => setFiltersSheetVisible(false)}
        onToggleIncludeTransfer={history.setIncludeTransfer}
        onClearFilters={history.clearAdvancedFilters}
      />

      <HistoryCategoryPickerSheet
        theme={theme}
        visible={categorySheetVisible}
        title={t('history.category')}
        categories={history.categories}
        selectedCategoryId={history.filters.categoryId}
        onClose={() => setCategorySheetVisible(false)}
        onSelect={history.setCategoryId}
      />

      <HistoryTypePickerSheet
        theme={theme}
        visible={typeSheetVisible}
        title={t('history.type')}
        options={typeOptions}
        selectedType={history.filters.type}
        onClose={() => setTypeSheetVisible(false)}
        onSelect={history.setType}
      />
    </>
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
    gap: 0
  },
  separator: {
    height: 10
  },
  sectionGap: {
    height: 4
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
