import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type HistoryDateSectionHeaderProps = {
  theme: AppTheme;
  label: string;
  dailyTotalLabel: string;
  dailyNetMajor: number;
};

export function HistoryDateSectionHeader({
  theme,
  label,
  dailyTotalLabel,
  dailyNetMajor
}: HistoryDateSectionHeaderProps) {
  const totalColor =
    dailyNetMajor > 0
      ? theme.colors.positive
      : dailyNetMajor < 0
        ? theme.colors.danger
        : theme.colors.textSecondary;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.total, { color: totalColor }]}>{dailyTotalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6
  },
  total: {
    fontSize: 13,
    fontWeight: '700'
  }
});
