import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { RecentTransaction } from '@/features/home/hooks/use-home-dashboard';

type RecentTransactionsSectionProps = {
  theme: AppTheme;
  sectionTitle: string;
  seeAllLabel: string;
  transactions: RecentTransaction[];
  merchantLabel: (categoryId: RecentTransaction['categoryId']) => string;
  timeLabel: (rowKey: RecentTransaction['timeRowKey']) => string;
  formatCurrency: (amount: number) => string;
};

function categoryIcon(
  categoryId: RecentTransaction['categoryId']
): ComponentProps<typeof Ionicons>['name'] {
  return categoryId === 'supermarket' ? 'cart-outline' : 'restaurant-outline';
}

export function RecentTransactionsSection({
  theme,
  sectionTitle,
  seeAllLabel,
  transactions,
  merchantLabel,
  timeLabel,
  formatCurrency
}: RecentTransactionsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {sectionTitle}
        </Text>
        <Pressable accessibilityRole="button">
          <Text style={[styles.seeAll, { color: theme.colors.textSecondary }]}>
            {seeAllLabel}
          </Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {transactions.map((tx) => (
          <View
            key={tx.id}
            style={[styles.row, { borderBottomColor: theme.colors.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Ionicons name={categoryIcon(tx.categoryId)} size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.mid}>
              <Text style={[styles.merchant, { color: theme.colors.textPrimary }]}>
                {merchantLabel(tx.categoryId)}
              </Text>
              <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                {timeLabel(tx.timeRowKey)}
              </Text>
            </View>
            <Text style={[styles.amount, { color: theme.colors.danger }]}>
              {formatCurrency(tx.amount)}
            </Text>
          </View>
        ))}
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
    gap: 0
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12
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
