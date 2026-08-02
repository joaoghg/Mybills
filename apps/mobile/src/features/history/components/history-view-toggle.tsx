import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

export type HistoryViewMode = 'list' | 'summary';

type HistoryViewToggleProps = {
  theme: AppTheme;
  viewMode: HistoryViewMode;
  listLabel: string;
  summaryLabel: string;
  onChange: (mode: HistoryViewMode) => void;
};

export function HistoryViewToggle({
  theme,
  viewMode,
  listLabel,
  summaryLabel,
  onChange
}: HistoryViewToggleProps) {
  const options: Array<{ mode: HistoryViewMode; label: string }> = [
    { mode: 'list', label: listLabel },
    { mode: 'summary', label: summaryLabel }
  ];

  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border
        }
      ]}
    >
      {options.map((option) => {
        const isSelected = option.mode === viewMode;
        return (
          <Pressable
            key={option.mode}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.mode)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isSelected ? theme.colors.surface : 'transparent',
                borderColor: isSelected ? theme.colors.border : 'transparent'
              },
              pressed && styles.pillPressed
            ]}
          >
            <Text
              style={[
                styles.pillLabel,
                {
                  color: isSelected ? theme.colors.primary : theme.colors.textSecondary
                }
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16
  },
  pill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  pillPressed: {
    opacity: 0.92
  }
});
