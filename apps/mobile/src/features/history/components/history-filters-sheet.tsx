import { Ionicons } from '@expo/vector-icons';
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
  filterByAccountLabel: string;
  filterByCardLabel: string;
  accountValueLabel: string;
  cardValueLabel: string;
  includeTransfer: boolean;
  hasActiveFilters: boolean;
  accountFilterActive: boolean;
  cardFilterActive: boolean;
  onClose: () => void;
  onToggleIncludeTransfer: (value: boolean) => void;
  onPressAccount: () => void;
  onPressCard: () => void;
  onClearFilters: () => void;
};

export function HistoryFiltersSheet({
  theme,
  visible,
  includeTransfersLabel,
  activeFiltersLabel,
  clearFiltersLabel,
  filterByAccountLabel,
  filterByCardLabel,
  accountValueLabel,
  cardValueLabel,
  includeTransfer,
  hasActiveFilters,
  accountFilterActive,
  cardFilterActive,
  onClose,
  onToggleIncludeTransfer,
  onPressAccount,
  onPressCard,
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

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: accountFilterActive }}
            onPress={onPressAccount}
            style={({ pressed }) => [
              styles.filterRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: accountFilterActive ? theme.colors.primary : theme.colors.border
              },
              pressed && styles.pressed
            ]}
          >
            <View style={styles.filterTextBlock}>
              <Text style={[styles.filterLabel, { color: theme.colors.textPrimary }]}>
                {filterByAccountLabel}
              </Text>
              <Text style={[styles.filterValue, { color: theme.colors.textSecondary }]}>
                {accountValueLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: cardFilterActive }}
            onPress={onPressCard}
            style={({ pressed }) => [
              styles.filterRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: cardFilterActive ? theme.colors.primary : theme.colors.border
              },
              pressed && styles.pressed
            ]}
          >
            <View style={styles.filterTextBlock}>
              <Text style={[styles.filterLabel, { color: theme.colors.textPrimary }]}>
                {filterByCardLabel}
              </Text>
              <Text style={[styles.filterValue, { color: theme.colors.textSecondary }]}>
                {cardValueLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </Pressable>

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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12
  },
  filterTextBlock: {
    flex: 1,
    gap: 2
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  filterValue: {
    fontSize: 13,
    fontWeight: '500'
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
  },
  pressed: {
    opacity: 0.92
  }
});
