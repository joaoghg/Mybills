import type { AppTheme } from '@/core/theme';
import type { ScheduleMode } from '@/features/transactions/utils/create-transaction-validation';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Option = {
  value: ScheduleMode;
  label: string;
};

type Props = {
  theme: AppTheme;
  selected: ScheduleMode;
  options: Option[];
  onSelect: (mode: ScheduleMode) => void;
  label: string;
};

export function TransactionScheduleSegment({
  theme,
  selected,
  options,
  onSelect,
  label
}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? theme.colors.textOnPrimary : theme.colors.textPrimary }
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    justifyContent: 'center'
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.92
  }
});
