import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';

type HistoryFiltersSheetProps = {
  theme: AppTheme;
  visible: boolean;
  includeTransfersLabel: string;
  activeFiltersLabel: string;
  clearFiltersLabel: string;
  includeTransfer: boolean;
  hasActiveFilters: boolean;
  onClose: () => void;
  onToggleIncludeTransfer: (value: boolean) => void;
  onClearFilters: () => void;
};

export function HistoryFiltersSheet({
  theme,
  visible,
  includeTransfersLabel,
  activeFiltersLabel,
  clearFiltersLabel,
  includeTransfer,
  hasActiveFilters,
  onClose,
  onToggleIncludeTransfer,
  onClearFilters
}: HistoryFiltersSheetProps) {
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
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{activeFiltersLabel}</Text>

          <View
            style={[
              styles.toggleRow,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
            ]}
          >
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>
              {includeTransfersLabel}
            </Text>
            <Switch
              value={includeTransfer}
              onValueChange={onToggleIncludeTransfer}
              trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }}
              thumbColor={includeTransfer ? theme.colors.primary : theme.colors.surfaceAlt}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!hasActiveFilters}
            onPress={() => {
              onClearFilters();
              onClose();
            }}
            style={({ pressed }) => [
              styles.clearBtn,
              {
                backgroundColor: hasActiveFilters ? theme.colors.primary : theme.colors.surfaceAlt,
                opacity: pressed ? 0.92 : hasActiveFilters ? 1 : 0.6
              }
            ]}
          >
            <Text
              style={[
                styles.clearLabel,
                {
                  color: hasActiveFilters
                    ? theme.colors.textOnPrimary
                    : theme.colors.textSecondary
                }
              ]}
            >
              {clearFiltersLabel}
            </Text>
          </Pressable>
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
    gap: 16
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12
  },
  clearBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14
  },
  clearLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
