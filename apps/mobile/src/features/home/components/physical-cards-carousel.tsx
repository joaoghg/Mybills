import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import type { PhysicalCard } from '@/features/home/hooks/use-home-dashboard';

const CARD_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

type PhysicalCardsCarouselProps = {
  theme: AppTheme;
  sectionTitle: string;
  cards: PhysicalCard[];
  availableLimitLabel: string;
  premiumLabel: string;
  contactlessLabel: string;
  formatCurrency: (amount: number) => string;
};

export function PhysicalCardsCarousel({
  theme,
  sectionTitle,
  cards,
  availableLimitLabel,
  premiumLabel,
  contactlessLabel,
  formatCurrency
}: PhysicalCardsCarouselProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{sectionTitle}</Text>
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
          return (
            <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: bgColor }]}>
              <View style={styles.cardTop}>
                <Ionicons
                  name="wifi"
                  size={22}
                  color="rgba(255,255,255,0.9)"
                  accessibilityLabel={contactlessLabel}
                />
                {item.tag === 'premium' ? (
                  <View style={styles.premiumPill}>
                    <Text style={styles.premiumText}>{premiumLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardNumber}>
                {t('home.cardMasked', { lastFour: item.lastFour })}
              </Text>
              <Text style={styles.limitLabel}>{availableLimitLabel}</Text>
              <Text style={styles.limitValue}>{formatCurrency(item.limit)}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 4
  },
  listContent: {
    paddingVertical: 4,
    paddingHorizontal: 4
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  premiumPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  premiumText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
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
