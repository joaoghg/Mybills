import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../../../core/theme';
import type { InvoiceSummary } from '../hooks/use-home-dashboard';

type InvoiceCardProps = {
  theme: AppTheme;
  invoice: InvoiceSummary;
  invoiceLabel: string;
  dueLabel: string;
  payLabel: string;
  formatCurrency: (amount: number) => string;
};

export function InvoiceCard({
  theme,
  invoice,
  invoiceLabel,
  dueLabel,
  payLabel,
  formatCurrency
}: InvoiceCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.textPrimary
        }
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.labels}>
          <Text style={[styles.kicker, { color: theme.colors.textSecondary }]}>{invoiceLabel}</Text>
          <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
            {formatCurrency(invoice.total)}
          </Text>
          <View style={styles.dueRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.dueText, { color: theme.colors.danger }]}>{dueLabel}</Text>
          </View>
        </View>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.danger}22` }]}>
          <Ionicons name="card-outline" size={22} color={theme.colors.danger} />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.payLabel, { color: theme.colors.textOnPrimary }]}>{payLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  labels: {
    flex: 1,
    gap: 6
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  dueText: {
    fontSize: 14,
    fontWeight: '600'
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  payButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  payLabel: {
    fontSize: 16,
    fontWeight: '800'
  }
});
