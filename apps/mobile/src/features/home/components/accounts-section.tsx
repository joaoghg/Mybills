import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../../../core/theme';
import type { AccountSummary } from '../hooks/use-home-dashboard';

type AccountsSectionProps = {
  theme: AppTheme;
  sectionTitle: string;
  newAccountLabel: string;
  formatPercentLine: (account: AccountSummary) => string;
  accounts: AccountSummary[];
  formatCurrency: (amount: number) => string;
  accountTitle: (id: AccountSummary['id']) => string;
  accountSubtitle: (id: AccountSummary['id']) => string;
};

function accountIcon(id: AccountSummary['id']): ComponentProps<typeof Ionicons>['name'] {
  return id === 'main' ? 'briefcase-outline' : 'cash-outline';
}

export function AccountsSection({
  theme,
  sectionTitle,
  newAccountLabel,
  formatPercentLine,
  accounts,
  formatCurrency,
  accountTitle,
  accountSubtitle
}: AccountsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {sectionTitle}
        </Text>
        <Pressable accessibilityRole="button">
          <Text style={[styles.link, { color: theme.colors.primary }]}>{newAccountLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.cards}>
        {accounts.map((account) => (
          <View
            key={account.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.textPrimary
              }
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Ionicons name={accountIcon(account.id)} size={22} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.cardMid}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                {accountTitle(account.id)}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                {accountSubtitle(account.id)}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.balance, { color: theme.colors.textPrimary }]}>
                {formatCurrency(account.balance)}
              </Text>
              <Text style={[styles.percent, { color: theme.colors.positive }]}>
                {formatPercentLine(account)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 12
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
  link: {
    fontSize: 14,
    fontWeight: '700'
  },
  cards: {
    gap: 12
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardMid: {
    flex: 1,
    gap: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  cardSubtitle: {
    fontSize: 13
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  balance: {
    fontSize: 16,
    fontWeight: '800'
  },
  percent: {
    fontSize: 12,
    fontWeight: '600'
  }
});
