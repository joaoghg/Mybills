import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';

type EntityOption = {
  id: string;
  name: string;
};

type HistoryEntityPickerSheetProps = {
  theme: AppTheme;
  visible: boolean;
  title: string;
  allLabel: string;
  entities: EntityOption[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
};

export function HistoryEntityPickerSheet({
  theme,
  visible,
  title,
  allLabel,
  entities,
  selectedId,
  onClose,
  onSelect
}: HistoryEntityPickerSheetProps) {
  const insets = useSafeAreaInsets();

  function selectAndClose(id: string | null) {
    onSelect(id);
    onClose();
  }

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
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.options}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedId === null }}
                onPress={() => selectAndClose(null)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: selectedId === null ? theme.colors.primary : theme.colors.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                  {allLabel}
                </Text>
              </Pressable>
              {entities.map((entity) => {
                const isSelected = selectedId === entity.id;
                return (
                  <Pressable
                    key={entity.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectAndClose(entity.id)}
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
                      {entity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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
    maxHeight: '75%',
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
    gap: 10,
    paddingBottom: 8
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
