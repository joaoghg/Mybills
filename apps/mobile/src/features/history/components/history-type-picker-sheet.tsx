import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';
import type { HistoryTypeFilter } from '@/features/history/hooks/use-transaction-history';

type TypeOption = {
  value: HistoryTypeFilter;
  label: string;
};

type HistoryTypePickerSheetProps = {
  theme: AppTheme;
  visible: boolean;
  title: string;
  options: TypeOption[];
  selectedType: HistoryTypeFilter;
  onClose: () => void;
  onSelect: (type: HistoryTypeFilter) => void;
};

export function HistoryTypePickerSheet({
  theme,
  visible,
  title,
  options,
  selectedType,
  onClose,
  onSelect
}: HistoryTypePickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: insets.bottom + 20
            }
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <View style={styles.options}>
            {options.map((option) => {
              const isSelected = selectedType === option.value;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border
                    },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  options: {
    gap: 10
  },
  option: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.92
  }
});
