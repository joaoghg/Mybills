import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import {
  addMonthsToYearMonth,
  formatYearMonth,
  formatYearMonthLabel,
  parseYearMonth
} from '@/shared/lib/billing-cycle';

type Props = {
  theme: AppTheme;
  valueYearMonth: string;
  locale: string;
  label: string;
  hint?: string;
  previousLabel: string;
  nextLabel: string;
  onChangeYearMonth: (yearMonth: string) => void;
};

function shiftYearMonth(yearMonth: string, delta: number): string {
  const normalized = yearMonth.length >= 7 ? yearMonth.slice(0, 7) : '1970-01';
  return formatYearMonth(addMonthsToYearMonth(parseYearMonth(normalized), delta));
}

export function TransactionCompetenceMonthField({
  theme,
  valueYearMonth,
  locale,
  label,
  hint,
  previousLabel,
  nextLabel,
  onChangeYearMonth
}: Props) {
  const displayLabel = useMemo(() => {
    const normalized = valueYearMonth.length >= 7 ? valueYearMonth.slice(0, 7) : '1970-01';
    return formatYearMonthLabel(parseYearMonth(normalized), locale, { withYear: true });
  }, [valueYearMonth, locale]);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousLabel}
          onPress={() => onChangeYearMonth(shiftYearMonth(valueYearMonth, -1))}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{displayLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          onPress={() => onChangeYearMonth(shiftYearMonth(valueYearMonth, 1))}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  row: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  navBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  value: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  hint: {
    fontSize: 13,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.85
  }
});
