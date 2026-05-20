import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { HomeCreditCardSummary } from '@/features/home/hooks/use-home-dashboard';

type CreditCardSummaryCardProps = {
  theme: AppTheme;
  card: HomeCreditCardSummary | null;
  title: string;
  dueOnLabel: string;
  statusOpenLabel: string;
  currentInvoiceLabel: string;
  availableLimitLabel: string;
  emptyLabel: string;
  formatCurrency: (amount: number) => string;
};

export function CreditCardSummaryCard({
  theme,
  card,
  title,
  dueOnLabel,
  statusOpenLabel,
  currentInvoiceLabel,
  availableLimitLabel,
  emptyLabel,
  formatCurrency
}: CreditCardSummaryCardProps) {
  if (!card) {
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
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
      </View>
    );
  }

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
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${theme.colors.secondary}18` }]}>
          <Ionicons name="card-outline" size={22} color={theme.colors.secondary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {dueOnLabel}
          </Text>
        </View>
        {card.isOpen ? (
          <View style={[styles.badge, { backgroundColor: `${theme.colors.positive}22` }]}>
            <Text style={[styles.badgeText, { color: theme.colors.positive }]}>
              {statusOpenLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.invoiceRow}>
        <Text style={[styles.invoiceLabel, { color: theme.colors.textSecondary }]}>
          {currentInvoiceLabel}
        </Text>
        <Text style={[styles.invoiceAmount, { color: theme.colors.textPrimary }]}>
          {formatCurrency(card.invoiceTotalMajor)}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.secondary,
              width: `${Math.round(card.usageRatio * 100)}%`
            }
          ]}
        />
      </View>

      <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
        {availableLimitLabel}: {formatCurrency(card.availableMajor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontSize: 16,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500'
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  invoiceLabel: {
    fontSize: 14,
    fontWeight: '500'
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: '800'
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4
  },
  footer: {
    fontSize: 13,
    fontWeight: '500'
  }
});
