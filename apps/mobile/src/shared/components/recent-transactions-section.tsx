import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { RecentAmountVariant, RecentTransactionRow } from '@/shared/types/recent-transaction';

type RecentTransactionsSectionProps = {
  theme: AppTheme;
  sectionTitle: string;
  seeAllLabel: string;
  transactions: RecentTransactionRow[];
  emptyLabel: string;
  emptyActionLabel?: string;
  onEmptyActionPress?: () => void;
  onSeeAllPress?: () => void;
  formatCurrency: (amount: number) => string;
};

function amountColor(theme: AppTheme, variant: RecentAmountVariant): string {
  if (variant === 'income') return theme.colors.positive;
  if (variant === 'expense') return theme.colors.danger;
  return theme.colors.textPrimary;
}

export function RecentTransactionsSection({
  theme,
  sectionTitle,
  seeAllLabel,
  transactions,
  emptyLabel,
  emptyActionLabel,
  onEmptyActionPress,
  onSeeAllPress,
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
          transactions.map((tx) => {
            const iconName = tx.iconName as ComponentProps<typeof Ionicons>['name'];
            const iconBg =
              tx.amountVariant === 'income'
                ? `${theme.colors.positive}22`
                : tx.amountVariant === 'expense'
                  ? `${theme.colors.danger}22`
                  : theme.colors.surfaceAlt;
            const iconColor =
              tx.amountVariant === 'income'
                ? theme.colors.positive
                : tx.amountVariant === 'expense'
                  ? theme.colors.danger
                  : theme.colors.textSecondary;

            return (
              <View
                key={tx.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.textPrimary
                  }
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={20} color={iconColor} />
                </View>
                <View style={styles.mid}>
                  <Text style={[styles.merchant, { color: theme.colors.textPrimary }]}>
                    {tx.merchant}
                  </Text>
                  <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                    {tx.timeLabel}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: amountColor(theme, tx.amountVariant) }]}>
                  {formatCurrency(tx.displayAmountMajor)}
                </Text>
              </View>
            );
          })
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mid: {
    flex: 1,
    gap: 2
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600'
  },
  time: {
    fontSize: 13
  },
  amount: {
    fontSize: 15,
    fontWeight: '700'
  }
});
