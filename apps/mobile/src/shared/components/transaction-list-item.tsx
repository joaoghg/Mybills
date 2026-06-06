import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { RecentAmountVariant, RecentTransactionRow } from '@/shared/types/recent-transaction';

type TransactionListItemProps = {
  theme: AppTheme;
  transaction: RecentTransactionRow;
  formatCurrency: (amount: number) => string;
  subtitle?: string;
};

function amountColor(theme: AppTheme, variant: RecentAmountVariant): string {
  if (variant === 'income') return theme.colors.positive;
  if (variant === 'expense') return theme.colors.danger;
  return theme.colors.textPrimary;
}

export function TransactionListItem({
  theme,
  transaction,
  formatCurrency,
  subtitle
}: TransactionListItemProps) {
  const tx = transaction;
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
        <Text style={[styles.merchant, { color: theme.colors.textPrimary }]}>{tx.merchant}</Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {subtitle ?? tx.timeLabel}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor(theme, tx.amountVariant) }]}>
        {formatCurrency(tx.displayAmountMajor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
