import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { SkeletonBox } from '@/shared/components/skeleton-box';

type AppScreenHeaderProps = {
  theme: AppTheme;
  greeting?: string;
  isLoadingGreeting?: boolean;
};

function initialsFromGreeting(greeting: string | undefined): string {
  if (!greeting) return '?';
  const match = greeting.match(/,\s*(.+)$/);
  const name = (match?.[1] ?? greeting).trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

export function AppScreenHeader({
  theme,
  greeting,
  isLoadingGreeting = false
}: AppScreenHeaderProps) {
  const initials = initialsFromGreeting(greeting);

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={[styles.avatarText, { color: theme.colors.textPrimary }]}>{initials}</Text>
      </View>
      <View style={styles.textCol}>
        {isLoadingGreeting ? (
          <SkeletonBox theme={theme} height={22} width={160} borderRadius={8} />
        ) : greeting ? (
          <Text style={[styles.greeting, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {greeting}
          </Text>
        ) : null}
      </View>
      <View style={[styles.bellWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Ionicons name="notifications-outline" size={22} color={theme.colors.textSecondary} />
      </View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800'
  },
  textCol: {
    flex: 1,
    justifyContent: 'center'
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
