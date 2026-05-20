import { StyleSheet, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { SkeletonBox } from '@/shared/components/skeleton-box';

type HomeContentSkeletonProps = {
  theme: AppTheme;
};

function balanceCardBackground(theme: AppTheme): string {
  return theme.mode === 'dark'
    ? theme.palette.secondary[800]
    : theme.palette.secondary[900];
}

export function HomeContentSkeleton({ theme }: HomeContentSkeletonProps) {
  return (
    <View style={styles.root}>
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: balanceCardBackground(theme) }
        ]}
      >
        <SkeletonBox
          theme={theme}
          height={12}
          width="38%"
          borderRadius={6}
          highlightColor="rgba(248, 250, 252, 0.14)"
        />
        <SkeletonBox
          theme={theme}
          height={34}
          width="62%"
          borderRadius={8}
          highlightColor="rgba(248, 250, 252, 0.2)"
          style={{ marginTop: 12 }}
        />
      </View>

      <View
        style={[
          styles.creditCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
        ]}
      >
        <View style={styles.creditHeader}>
          <SkeletonBox theme={theme} width={44} height={44} borderRadius={12} />
          <View style={styles.creditMid}>
            <SkeletonBox theme={theme} height={16} width="55%" borderRadius={6} />
            <SkeletonBox theme={theme} height={13} width="40%" borderRadius={6} style={{ marginTop: 8 }} />
          </View>
          <SkeletonBox theme={theme} height={24} width={56} borderRadius={8} />
        </View>
        <SkeletonBox theme={theme} height={14} width="45%" borderRadius={6} style={{ marginTop: 16 }} />
        <SkeletonBox theme={theme} height={8} width="100%" borderRadius={4} style={{ marginTop: 12 }} />
        <SkeletonBox theme={theme} height={13} width="60%" borderRadius={6} style={{ marginTop: 12 }} />
      </View>

      <View style={styles.rowBetween}>
        <SkeletonBox theme={theme} height={22} width="50%" borderRadius={8} />
        <SkeletonBox theme={theme} height={14} width={64} borderRadius={6} />
      </View>

      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.txRow,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <SkeletonBox theme={theme} width={44} height={44} borderRadius={22} />
          <View style={styles.txMid}>
            <SkeletonBox theme={theme} height={16} width="60%" borderRadius={6} />
            <SkeletonBox theme={theme} height={13} width="35%" borderRadius={6} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox theme={theme} height={16} width={72} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
    marginBottom: 24
  },
  balanceCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 16
  },
  creditCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 10
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  creditMid: {
    flex: 1
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12
  },
  txMid: {
    flex: 1
  }
});
