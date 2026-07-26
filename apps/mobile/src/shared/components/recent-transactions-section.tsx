import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { TransactionListItem } from '@/shared/components/transaction-list-item';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';

type RecentTransactionsSectionProps = {
  theme: AppTheme;
  sectionTitle: string;
  seeAllLabel: string;
  transactions: RecentTransactionRow[];
  emptyLabel: string;
  emptyActionLabel?: string;
  onEmptyActionPress?: () => void;
  onSeeAllPress?: () => void;
  onTransactionPress?: (transaction: RecentTransactionRow) => void;
  formatCurrency: (amount: number) => string;
};

export function RecentTransactionsSection({
  theme,
  sectionTitle,
  seeAllLabel,
  transactions,
  emptyLabel,
  emptyActionLabel,
  onEmptyActionPress,
  onSeeAllPress,
  onTransactionPress,
  formatCurrency
}: RecentTransactionsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {sectionTitle}
        </Text>
        {onSeeAllPress ? (
          <Pressable accessibilityRole="button" onPress={onSeeAllPress}>
            <Text style={[styles.seeAll, { color: theme.colors.primary }]}>{seeAllLabel}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.seeAll, { color: theme.colors.primary }]}>{seeAllLabel}</Text>
        )}
      </View>
      <View style={styles.list}>
        {transactions.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
            {emptyActionLabel && onEmptyActionPress ? (
              <Pressable
                accessibilityRole="button"
                onPress={onEmptyActionPress}
                style={[styles.emptyCta, { borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.emptyCtaLabel, { color: theme.colors.primary }]}>
                  {emptyActionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          transactions.map((tx) => (
            <TransactionListItem
              key={tx.id}
              theme={theme}
              transaction={tx}
              formatCurrency={formatCurrency}
              onPress={onTransactionPress ? () => onTransactionPress(tx) : undefined}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    paddingBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6
  },
  list: {
    gap: 10
  },
  emptyBlock: {
    gap: 12,
    paddingVertical: 4
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
