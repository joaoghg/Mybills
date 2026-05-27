import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_ICONS, type CategoryIcon } from '@mybills/dtos';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type Props = {
  theme: AppTheme;
  selectedIcon: CategoryIcon;
  onSelect: (icon: CategoryIcon) => void;
};

export function CategoryIconPicker({ theme, selectedIcon, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        {t('categories.iconSectionTitle')}
      </Text>
      <View style={styles.grid}>
        {CATEGORY_ICONS.map((icon) => {
          const isSelected = icon === selectedIcon;
          const ioniconName = icon as ComponentProps<typeof Ionicons>['name'];

          return (
            <Pressable
              key={icon}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t('categories.iconAccessibility', { icon })}
              onPress={() => onSelect(icon)}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: isSelected ? `${theme.colors.primary}22` : theme.colors.surfaceAlt,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.iconButtonPressed
              ]}
            >
              <Ionicons
                name={ioniconName}
                size={24}
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
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
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonPressed: {
    opacity: 0.88
  }
});
