import type { CategoryTransactionType } from '@mybills/dtos';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

const CATEGORY_TYPES: CategoryTransactionType[] = ['EXPENSE', 'INCOME'];

type Props = {
  theme: AppTheme;
  selectedTypes: CategoryTransactionType[];
  onToggle: (type: CategoryTransactionType) => void;
};

function typeLabelKey(type: CategoryTransactionType): 'typeExpense' | 'typeIncome' {
  return type === 'INCOME' ? 'typeIncome' : 'typeExpense';
}

export function CategoryTypePicker({ theme, selectedTypes, onToggle }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
        {t('categories.typesLabel')}
      </Text>
      <View style={styles.segment}>
        {CATEGORY_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type);

          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(type)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: isSelected ? `${theme.colors.primary}22` : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.pillPressed
              ]}
            >
              <Text
                style={[
                  styles.pillLabel,
                  { color: isSelected ? theme.colors.primary : theme.colors.textPrimary }
                ]}
              >
                {t(`categories.${typeLabelKey(type)}`)}
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
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  pill: {
    flexGrow: 1,
    minWidth: '45%',
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700'
  },
  pillPressed: {
    opacity: 0.92
  }
});
