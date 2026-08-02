import type { CategoryOutput } from '@mybills/dtos';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';
import { CategorySelectPicker } from '@/features/transactions/components/category-select-picker';

type HistoryCategoryPickerSheetProps = {
  theme: AppTheme;
  visible: boolean;
  title: string;
  categories: CategoryOutput[];
  selectedCategoryId: string | null;
  onClose: () => void;
  onSelect: (categoryId: string | null) => void;
};

export function HistoryCategoryPickerSheet({
  theme,
  visible,
  title,
  categories,
  selectedCategoryId,
  onClose,
  onSelect
}: HistoryCategoryPickerSheetProps) {
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
          <ScrollView showsVerticalScrollIndicator={false}>
            <CategorySelectPicker
              theme={theme}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={(categoryId) => {
                onSelect(categoryId);
                onClose();
              }}
            />
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
    fontWeight: '800',
    marginBottom: 4
  }
});
