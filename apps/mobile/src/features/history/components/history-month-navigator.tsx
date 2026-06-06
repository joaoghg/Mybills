import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { HistoryMonthYearPickerSheet } from '@/features/history/components/history-month-year-picker-sheet';

type HistoryMonthNavigatorProps = {
  theme: AppTheme;
  locale: string;
  monthTitle: string;
  monthlyHistoryLabel: string;
  selectedMonth: number;
  selectedYear: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelectMonth: (month: number, year: number) => void;
};

export function HistoryMonthNavigator({
  theme,
  locale,
  monthTitle,
  monthlyHistoryLabel,
  selectedMonth,
  selectedYear,
  onPrevious,
  onNext,
  onSelectMonth
}: HistoryMonthNavigatorProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.previousMonth')}
          onPress={onPrevious}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.selectMonth')}
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => [styles.titleCol, pressed && styles.pressed]}
        >
          <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>{monthTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {monthlyHistoryLabel.toUpperCase()}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('history.nextMonth')}
          onPress={onNext}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <HistoryMonthYearPickerSheet
        theme={theme}
        visible={showPicker}
        title={t('history.selectMonth')}
        doneLabel={t('history.selectMonthDone')}
        locale={locale}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setShowPicker(false)}
        onConfirm={onSelectMonth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  pressed: {
    opacity: 0.9
  }
});
