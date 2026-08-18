import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import {
  useInvestment,
  useInvestmentTransactions
} from '@/features/open-finance/hooks/use-investments';
import type { RootStackParamList } from '@/navigation/types';
import { centsToMajor } from '@/shared/utils/cents-to-major';
import { formatCurrencyValue } from '@/shared/utils/format-currency';
import { formatDecimalValue } from '@/shared/utils/format-number';

type Props = NativeStackScreenProps<RootStackParamList, 'InvestmentDetail'>;

export function InvestmentDetailScreen({ navigation, route }: Props) {
  const { investmentId } = route.params;
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { data: investment, isLoading } = useInvestment(investmentId);
  const { data: movements = [] } = useInvestmentTransactions(investmentId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: investment?.name ?? t('openFinance.investmentDetailTitle') });
  }, [investment?.name, navigation, t]);

  if (isLoading || !investment) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const locale = i18n.language;

  return (
    <ScrollView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
        {formatCurrencyValue(centsToMajor(investment.balance), locale)}
      </Text>
      {investment.annualRate ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('openFinance.annualRate')}: {formatDecimalValue(Number(investment.annualRate) * 100, locale, 2)}%
        </Text>
      ) : null}
      {investment.quantity ? (
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('openFinance.quantity')}: {formatDecimalValue(Number(investment.quantity), locale, 6)}
        </Text>
      ) : null}
      <Text style={[styles.section, { color: theme.colors.textPrimary }]}>
        {t('openFinance.movements')}
      </Text>
      {movements.map((movement) => (
        <View
          key={movement.id}
          style={[styles.row, { borderColor: theme.colors.border }]}
        >
          <Text style={{ color: theme.colors.textPrimary }}>
            {t(`openFinance.investmentTxTypes.${movement.type}`)}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {new Date(movement.date).toLocaleDateString(locale)}
            {movement.amount
              ? ` · ${formatDecimalValue(Number(movement.amount), locale, 2)}`
              : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  amount: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  section: { marginTop: 24, marginBottom: 8, fontSize: 16, fontWeight: '700' },
  row: { borderBottomWidth: 1, paddingVertical: 12 }
});
