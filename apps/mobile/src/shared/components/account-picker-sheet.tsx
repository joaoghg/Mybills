import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';
import type { InvoiceAccountOption } from '@/shared/hooks/use-invoice-detail';

export type AccountPickerSheetProps = {
  theme: AppTheme;
  visible: boolean;
  title: string;
  accounts: InvoiceAccountOption[];
  emptyLabel: string;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onSelect: (accountId: string) => void;
};

export function AccountPickerSheet({
  theme,
  visible,
  title,
  accounts,
  emptyLabel,
  formatCurrency,
  onClose,
  onSelect
}: AccountPickerSheetProps) {
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

          {accounts.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(account.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.92 : 1
                    }
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Ionicons name="wallet-outline" size={22} color={theme.colors.textSecondary} />
                  </View>
                  <View style={styles.mid}>
                    <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                      {account.name}
                    </Text>
                    <Text style={[styles.balance, { color: theme.colors.textSecondary }]}>
                      {formatCurrency(account.balanceMajor)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          )}
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
    maxHeight: '70%',
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
  },
  list: {
    maxHeight: 360
  },
  empty: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 16
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mid: {
    flex: 1,
    gap: 2
  },
  name: {
    fontSize: 16,
    fontWeight: '600'
  },
  balance: {
    fontSize: 13,
    fontWeight: '500'
  }
});
