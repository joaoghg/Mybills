import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type FilterButton = {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

type HistoryFilterBarProps = {
  theme: AppTheme;
  buttons: FilterButton[];
};

export function HistoryFilterBar({ theme, buttons }: HistoryFilterBarProps) {
  return (
    <View style={styles.row}>
      {buttons.map((button) => (
        <Pressable
          key={button.key}
          accessibilityRole="button"
          accessibilityState={{ selected: button.active }}
          onPress={button.onPress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: button.active ? `${theme.colors.primary}18` : theme.colors.surface,
              borderColor: button.active ? theme.colors.primary : theme.colors.border
            },
            pressed && styles.pressed
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: button.active ? theme.colors.primary : theme.colors.textPrimary }
            ]}
          >
            {button.label}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={button.active ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  button: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  label: {
    fontSize: 13,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.92
  }
});
