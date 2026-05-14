import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type HomeHeaderProps = {
  theme: AppTheme;
  brandName: string;
};

export function HomeHeader({
  theme,
  brandName
}: HomeHeaderProps) {
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brand: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  bell: {
    padding: 8
  }
});
