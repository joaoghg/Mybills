import type { CreateTransactionInput } from '@mybills/dtos';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

const TYPES: CreateTransactionInput['type'][] = ['EXPENSE', 'INCOME', 'TRANSFER'];

type Props = {
  theme: AppTheme;
  selectedType: CreateTransactionInput['type'];
  onSelect: (type: CreateTransactionInput['type']) => void;
};

function typeLabelKey(
  type: CreateTransactionInput['type']
): 'types.expense' | 'types.income' | 'types.transfer' {
  if (type === 'INCOME') return 'types.income';
  if (type === 'TRANSFER') return 'types.transfer';
  return 'types.expense';
}

export function TransactionTypeSegment({ theme, selectedType, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
        {t('transactions.typeLabel')}
      </Text>
      <View style={styles.segment}>
        {TYPES.map((type) => {
          const isSelected = type === selectedType;
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(type)}
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
                {t(`transactions.${typeLabelKey(type)}`)}
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
    minWidth: '30%',
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
