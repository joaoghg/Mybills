import { Ionicons } from '@expo/vector-icons';
import type { CategoryOutput } from '@mybills/dtos';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type Props = {
  theme: AppTheme;
  categories: CategoryOutput[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
};

export function CategorySelectPicker({ theme, categories, selectedCategoryId, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
        {t('transactions.categoryLabel')}
      </Text>
      <View style={styles.options}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedCategoryId === null }}
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: selectedCategoryId === null ? theme.colors.primary : theme.colors.border
            },
            pressed && styles.optionPressed
          ]}
        >
          <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
            {t('transactions.categoryNone')}
          </Text>
        </Pressable>
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id;
          const iconName = category.icon as ComponentProps<typeof Ionicons>['name'];

          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(category.id)}
              style={({ pressed }) => [
                styles.optionCard,
                styles.optionWithIcon,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.optionPressed
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isSelected
                      ? `${theme.colors.primary}22`
                      : theme.colors.surfaceAlt
                  }
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={18}
                  color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  options: {
    gap: 10
  },
  optionCard: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  optionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600'
  },
  optionPressed: {
    opacity: 0.92
  }
});
