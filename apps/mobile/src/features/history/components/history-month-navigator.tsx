import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type MonthPill = {
  month: number;
  year: number;
  label: string;
};

type HistoryMonthNavigatorProps = {
  theme: AppTheme;
  monthTitle: string;
  monthlyHistoryLabel: string;
  pills: MonthPill[];
  selectedMonth: number;
  selectedYear: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelectMonth: (month: number, year: number) => void;
};

export function HistoryMonthNavigator({
  theme,
  monthTitle,
  monthlyHistoryLabel,
  pills,
  selectedMonth,
  selectedYear,
  onPrevious,
  onNext,
  onSelectMonth
}: HistoryMonthNavigatorProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrevious}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleCol}>
          <Text style={[styles.monthTitle, { color: theme.colors.textPrimary }]}>{monthTitle}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {monthlyHistoryLabel.toUpperCase()}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={onNext}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {pills.map((pill) => {
          const isSelected = pill.month === selectedMonth && pill.year === selectedYear;
          return (
            <Pressable
              key={`${pill.year}-${pill.month}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectMonth(pill.month, pill.year)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text
                style={[
                  styles.pillLabel,
                  { color: isSelected ? theme.colors.textOnPrimary : theme.colors.textPrimary }
                ]}
              >
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
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
  pillsRow: {
    gap: 8,
    paddingVertical: 2
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  pressed: {
    opacity: 0.9
  }
});
