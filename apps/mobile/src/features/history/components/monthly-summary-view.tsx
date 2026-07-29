import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type {
  SummaryCardInvoiceRow,
  SummaryTransactionRow
} from '@/features/history/hooks/use-monthly-summary';
import { TransactionListItem } from '@/shared/components/transaction-list-item';

type MonthlySummaryViewProps = {
  theme: AppTheme;
  incomeTotalMajor: number;
  expenseTotalMajor: number;
  netTotalMajor: number;
  incomeLabel: string;
  expensesLabel: string;
  netLabel: string;
  emptyLabel: string;
  invoiceHintLabel: string;
  income: SummaryTransactionRow[];
  expenses: SummaryTransactionRow[];
  cardInvoices: SummaryCardInvoiceRow[];
  isEmpty: boolean;
  formatCurrency: (amount: number) => string;
  onTransactionPress: (row: SummaryTransactionRow) => void;
};

export function MonthlySummaryView({
  theme,
  incomeTotalMajor,
  expenseTotalMajor,
  netTotalMajor,
  incomeLabel,
  expensesLabel,
  netLabel,
  emptyLabel,
  invoiceHintLabel,
  income,
  expenses,
  cardInvoices,
  isEmpty,
  formatCurrency,
  onTransactionPress
}: MonthlySummaryViewProps) {
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => new Set());

  function toggleCard(cardId: string) {
    setExpandedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  if (isEmpty) {
    return (
      <View style={styles.emptyBlock}>
        <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.totalsCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.textPrimary
          }
        ]}
      >
        <TotalsRow
          theme={theme}
          label={incomeLabel}
          amount={formatCurrency(incomeTotalMajor)}
          amountColor={theme.colors.positive}
        />
        <TotalsRow
          theme={theme}
          label={expensesLabel}
          amount={formatCurrency(expenseTotalMajor)}
          amountColor={theme.colors.danger}
        />
        <View style={[styles.totalsDivider, { backgroundColor: theme.colors.border }]} />
        <TotalsRow
          theme={theme}
          label={netLabel}
          amount={formatCurrency(netTotalMajor)}
          amountColor={
            netTotalMajor >= 0 ? theme.colors.positive : theme.colors.danger
          }
          emphasize
        />
      </View>

      {income.length > 0 ? (
        <SummarySection theme={theme} title={incomeLabel}>
          {income.map((row) => (
            <TransactionListItem
              key={row.id}
              theme={theme}
              transaction={row}
              subtitle={row.subtitle}
              formatCurrency={formatCurrency}
              onPress={() => onTransactionPress(row)}
            />
          ))}
        </SummarySection>
      ) : null}

      {expenses.length > 0 || cardInvoices.length > 0 ? (
        <SummarySection theme={theme} title={expensesLabel}>
          {expenses.map((row) => (
            <TransactionListItem
              key={row.id}
              theme={theme}
              transaction={row}
              subtitle={row.subtitle}
              formatCurrency={formatCurrency}
              onPress={() => onTransactionPress(row)}
            />
          ))}

          {cardInvoices.map((invoice) => {
            const expanded = expandedCardIds.has(invoice.cardId);
            return (
              <View key={invoice.cardId} style={styles.invoiceBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => toggleCard(invoice.cardId)}
                  style={({ pressed }) => [
                    styles.invoiceRow,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.textPrimary
                    },
                    pressed && styles.pressed
                  ]}
                >
                  <View
                    style={[
                      styles.invoiceIcon,
                      { backgroundColor: `${theme.colors.secondary}18` }
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={theme.colors.secondary}
                    />
                  </View>
                  <View style={styles.invoiceMid}>
                    <Text style={[styles.invoiceTitle, { color: theme.colors.textPrimary }]}>
                      {invoice.title}
                    </Text>
                    <Text style={[styles.invoiceHint, { color: theme.colors.textSecondary }]}>
                      {invoiceHintLabel}
                    </Text>
                  </View>
                  <Text style={[styles.invoiceAmount, { color: theme.colors.danger }]}>
                    {formatCurrency(-invoice.totalMajor)}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>

                {expanded ? (
                  <View style={styles.invoiceChildren}>
                    {invoice.transactions.map((row) => (
                      <TransactionListItem
                        key={row.id}
                        theme={theme}
                        transaction={row}
                        subtitle={row.subtitle}
                        formatCurrency={formatCurrency}
                        onPress={() => onTransactionPress(row)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </SummarySection>
      ) : null}
    </View>
  );
}

function TotalsRow({
  theme,
  label,
  amount,
  amountColor,
  emphasize = false
}: {
  theme: AppTheme;
  label: string;
  amount: string;
  amountColor: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.totalsRow}>
      <Text
        style={[
          emphasize ? styles.totalsLabelStrong : styles.totalsLabel,
          { color: theme.colors.textPrimary }
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          emphasize ? styles.totalsAmountStrong : styles.totalsAmount,
          { color: amountColor }
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}

function SummarySection({
  theme,
  title,
  children
}: {
  theme: AppTheme;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
    paddingBottom: 8
  },
  totalsCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  totalsLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  totalsLabelStrong: {
    fontSize: 16,
    fontWeight: '800'
  },
  totalsAmount: {
    fontSize: 15,
    fontWeight: '700'
  },
  totalsAmountStrong: {
    fontSize: 17,
    fontWeight: '800'
  },
  totalsDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  sectionBody: {
    gap: 10
  },
  invoiceBlock: {
    gap: 10
  },
  invoiceRow: {
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
  invoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  invoiceMid: {
    flex: 1,
    gap: 2
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  invoiceHint: {
    fontSize: 13
  },
  invoiceAmount: {
    fontSize: 15,
    fontWeight: '700'
  },
  invoiceChildren: {
    gap: 10,
    paddingLeft: 12
  },
  emptyBlock: {
    paddingVertical: 16
  },
  empty: {
    fontSize: 14
  },
  pressed: {
    opacity: 0.92
  }
});
