import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type HomeHeaderProps = {
  theme: AppTheme;
  brandName: string;
  notificationsLabel: string;
  profileLabel: string;
};

export function HomeHeader({
  theme,
  brandName,
  notificationsLabel,
  profileLabel
}: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={profileLabel}
        style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt }]}
      >
        <Ionicons name="person" size={22} color={theme.colors.textSecondary} />
      </Pressable>
      <Text style={[styles.brand, { color: theme.colors.textPrimary }]}>{brandName}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={notificationsLabel}
        style={styles.bell}
      >
        <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
      </Pressable>
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
