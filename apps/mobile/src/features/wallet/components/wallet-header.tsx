import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type WalletHeaderProps = {
  theme: AppTheme;
  brandName: string;
};

export function WalletHeader({ theme, brandName }: WalletHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.brand, { color: theme.colors.textPrimary }]}>{brandName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  brand: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3
  }
});
