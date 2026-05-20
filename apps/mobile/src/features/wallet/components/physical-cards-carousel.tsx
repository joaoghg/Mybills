import { Ionicons } from '@expo/vector-icons';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { WalletPhysicalCard } from '@/features/wallet/hooks/use-wallet-dashboard';

const CARD_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

type PhysicalCardsCarouselProps = {
  theme: AppTheme;
  sectionTitle: string;
  headerActionLabel?: string;
  onHeaderActionPress?: () => void;
  cards: WalletPhysicalCard[];
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  availableLimitLabel: string;
  contactlessLabel: string;
  formatCurrency: (amount: number) => string;
  emptyLabel?: string;
  emptyActionLabel?: string;
  onEmptyActionPress?: () => void;
};

export function PhysicalCardsCarousel({
  theme,
  sectionTitle,
  headerActionLabel,
  onHeaderActionPress,
  cards,
  selectedCardId,
  onSelectCard,
  availableLimitLabel,
  contactlessLabel,
  formatCurrency,
  emptyLabel,
  emptyActionLabel,
  onEmptyActionPress
}: PhysicalCardsCarouselProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{sectionTitle}</Text>
        {headerActionLabel && onHeaderActionPress ? (
          <Pressable accessibilityRole="button" onPress={onHeaderActionPress}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>{headerActionLabel}</Text>
          </Pressable>
        ) : headerActionLabel ? (
          <Text style={[styles.link, { color: theme.colors.primary }]}>{headerActionLabel}</Text>
        ) : null}
      </View>
      {cards.length === 0 ? (
        <View style={styles.emptyBlock}>
          {emptyLabel ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{emptyLabel}</Text>
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
        <FlatList
          data={cards}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => {
            const bgColor =
              item.variant === 'navy' ? theme.palette.secondary[800] : theme.palette.primary[800];
            const selected = item.id === selectedCardId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectCard(item.id)}
                style={({ pressed }) => [
                  styles.cardPress,
                  selected && [styles.cardPressSelected, { borderColor: theme.colors.primary }],
                  pressed && styles.cardPressPressed
                ]}
              >
                <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: bgColor }]}>
                  <View style={styles.cardTop}>
                    <Ionicons
                      name="wifi"
                      size={22}
                      color="rgba(255,255,255,0.9)"
                      accessibilityLabel={contactlessLabel}
                    />
                  </View>
                  <Text style={styles.cardName} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                  </Text>
                  <Text style={styles.limitLabel}>{availableLimitLabel}</Text>
                  <Text style={styles.limitValue}>{formatCurrency(item.availableLimitMajor)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    gap: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1
  },
  link: {
    fontSize: 14,
    fontWeight: '700'
  },
  emptyBlock: {
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 4
  },
  emptyText: {
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
  listContent: {
    paddingVertical: 4,
    paddingHorizontal: 4
  },
  cardPress: {
    borderRadius: 22,
    padding: 3
  },
  cardPressSelected: {
    borderWidth: 2
  },
  cardPressPressed: {
    opacity: 0.92
  },
  card: {
    borderRadius: 18,
    padding: 18,
    minHeight: 168,
    justifyContent: 'flex-end',
    gap: 6
  },
  cardTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  cardName: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12
  },
  limitLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  limitValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800'
  }
});
