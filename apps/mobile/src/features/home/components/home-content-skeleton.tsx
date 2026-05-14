import { StyleSheet, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { SkeletonBox } from '@/shared/components/skeleton-box';

type HomeContentSkeletonProps = {
  theme: AppTheme;
};

export function HomeContentSkeleton({ theme }: HomeContentSkeletonProps) {
  return (
    <View style={styles.root}>
      <View style={styles.rowBetween}>
        <SkeletonBox theme={theme} height={22} width="45%" borderRadius={8} />
        <SkeletonBox theme={theme} height={18} width={72} borderRadius={6} />
      </View>
      <View
        style={[
          styles.accountCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
        ]}
      >
        <SkeletonBox theme={theme} width={48} height={48} borderRadius={24} />
        <View style={styles.accountMid}>
          <SkeletonBox theme={theme} height={16} width="55%" borderRadius={6} />
          <SkeletonBox theme={theme} height={14} width="40%" borderRadius={6} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBox theme={theme} height={18} width={88} borderRadius={6} />
      </View>

      <SkeletonBox theme={theme} height={22} width="50%" borderRadius={8} style={{ marginTop: 8 }} />
      <SkeletonBox
        theme={theme}
        height={168}
        width="88%"
        borderRadius={18}
        style={{ marginTop: 12, maxWidth: 320 }}
      />

      <View
        style={[
          styles.invoiceCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
        ]}
      >
        <SkeletonBox theme={theme} height={14} width={120} borderRadius={6} />
        <SkeletonBox theme={theme} height={32} width="70%" borderRadius={8} style={{ marginTop: 12 }} />
        <SkeletonBox theme={theme} height={16} width={160} borderRadius={6} style={{ marginTop: 12 }} />
        <SkeletonBox theme={theme} height={48} width="100%" borderRadius={14} style={{ marginTop: 16 }} />
      </View>

      <View style={styles.rowBetween}>
        <SkeletonBox theme={theme} height={22} width="40%" borderRadius={8} />
        <SkeletonBox theme={theme} height={14} width={56} borderRadius={6} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.txRow, { borderBottomColor: theme.colors.border }]}>
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
    gap: 12,
    marginBottom: 24
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12
  },
  accountMid: {
    flex: 1,
    gap: 0
  },
  invoiceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12
  },
  txMid: {
    flex: 1
  }
});
