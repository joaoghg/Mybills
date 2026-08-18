import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import { useInvestments } from '@/features/open-finance/hooks/use-investments';
import type { RootStackParamList } from '@/navigation/types';
import { formatCurrencyValue } from '@/shared/utils/format-currency';
import { centsToMajor } from '@/shared/utils/cents-to-major';

type Props = NativeStackScreenProps<RootStackParamList, 'Investments'>;

export function InvestmentsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { data = [], isLoading } = useInvestments();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('openFinance.investmentsTitle') });
  }, [navigation, t]);

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {data.length === 0 && !isLoading ? (
        <Text style={{ color: theme.colors.textSecondary }}>{t('openFinance.investmentsEmpty')}</Text>
      ) : null}
      {data.map((investment) => (
        <Pressable
          key={investment.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('InvestmentDetail', { investmentId: investment.id })}
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{investment.name}</Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {t(`openFinance.investmentTypes.${investment.type}`)}
          </Text>
          <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
            {formatCurrencyValue(centsToMajor(investment.balance), i18n.language)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  amount: { marginTop: 8, fontSize: 18, fontWeight: '700' }
});
