import { Platform, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

const BALANCE_LABEL_COLOR = 'rgba(248, 250, 252, 0.72)';
const BALANCE_AMOUNT_COLOR = '#FFFFFF';

type GeneralBalanceCardProps = {
  theme: AppTheme;
  label: string;
  formatCurrency: (amount: number) => string;
  balanceMajor: number;
};

function balanceCardBackground(theme: AppTheme): string {
  return theme.mode === 'dark'
    ? theme.palette.secondary[800]
    : theme.palette.secondary[900];
}

export function GeneralBalanceCard({
  theme,
  label,
  formatCurrency,
  balanceMajor
}: GeneralBalanceCardProps) {
  const isLight = theme.mode === 'light';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: balanceCardBackground(theme) },
        isLight ? styles.cardShadowLight : styles.cardBorderDark
      ]}
    >
      <Text style={[styles.label, { color: BALANCE_LABEL_COLOR }]}>{label}</Text>
      <Text style={[styles.amount, { color: BALANCE_AMOUNT_COLOR }]}>
        {formatCurrency(balanceMajor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
    marginBottom: 16
  },
  cardShadowLight: {
    ...Platform.select({
      ios: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18
      },
      android: {
        elevation: 10
      },
      default: {}
    })
  },
  cardBorderDark: {
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.08)'
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5
  }
});
