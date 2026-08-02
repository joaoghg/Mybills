import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { WalletAccountRow } from '@/features/wallet/hooks/use-wallet-dashboard';

type AccountsSectionProps = {
  theme: AppTheme;
  sectionTitle: string;
  headerActionLabel?: string;
  onHeaderActionPress?: () => void;
  accounts: WalletAccountRow[];
  formatCurrency: (amount: number) => string;
  emptyLabel?: string;
  emptyActionLabel?: string;
  onEmptyActionPress?: () => void;
  onAccountPress?: (accountId: string) => void;
};

function accountIcon(): ComponentProps<typeof Ionicons>['name'] {
  return 'wallet-outline';
}

export function AccountsSection({
  theme,
  sectionTitle,
  headerActionLabel,
  onHeaderActionPress,
  accounts,
  formatCurrency,
  emptyLabel,
  emptyActionLabel,
  onEmptyActionPress,
  onAccountPress
}: AccountsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {sectionTitle}
        </Text>
        {headerActionLabel && onHeaderActionPress ? (
          <Pressable accessibilityRole="button" onPress={onHeaderActionPress}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>{headerActionLabel}</Text>
          </Pressable>
        ) : headerActionLabel ? (
          <Text style={[styles.link, { color: theme.colors.primary }]}>{headerActionLabel}</Text>
        ) : null}
      </View>
      {accounts.length === 0 ? (
        <View style={styles.emptyBlock}>
          {emptyLabel ? (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
          ) : null}
          {emptyActionLabel && onEmptyActionPress ? (
            <Pressable
              accessibilityRole="button"
              onPress={onEmptyActionPress}
              style={[styles.emptyCta, { borderColor: theme.colors.primary }]}
            >
              <Text style={[styles.emptyCtaLabel, { color: theme.colors.primary }]}>
                {emptyActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.cards}>
          {accounts.map((account) => {
            const cardContent = (
              <>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Ionicons name={accountIcon()} size={22} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.cardMid}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                    {account.title}
                  </Text>
                  {account.subtitle ? (
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                      {account.subtitle}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.balance, { color: theme.colors.textPrimary }]}>
                    {formatCurrency(account.balanceMajor)}
                  </Text>
                </View>
              </>
            );

            if (onAccountPress) {
              return (
                <Pressable
                  key={account.id}
                  accessibilityRole="button"
                  onPress={() => onAccountPress(account.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.textPrimary
                    },
                    pressed && styles.cardPressed
                  ]}
                >
                  {cardContent}
                </Pressable>
              );
            }

            return (
              <View
                key={account.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.textPrimary
                  }
                ]}
              >
                {cardContent}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  link: {
    fontSize: 14,
    fontWeight: '700'
  },
  emptyBlock: {
    gap: 12,
    paddingVertical: 4
  },
  empty: {
    fontSize: 14
  },
  emptyCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5
  },
  emptyCtaLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  cards: {
    gap: 12
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  cardPressed: {
    opacity: 0.92
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardMid: {
    flex: 1,
    gap: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  cardSubtitle: {
    fontSize: 13
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  balance: {
    fontSize: 16,
    fontWeight: '800'
  }
});
