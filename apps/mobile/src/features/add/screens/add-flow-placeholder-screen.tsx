import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';
import type { RootStackParamList } from '@/navigation/types';

type AddFlowRouteName = keyof Pick<
  RootStackParamList,
  'AddAccount' | 'AddTransaction' | 'AddCreditCard'
>;

type Props = NativeStackScreenProps<RootStackParamList, AddFlowRouteName>;

export function AddFlowPlaceholderScreen({ route }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const subtitle =
    route.name === 'AddAccount'
      ? t('quickAdd.accountSubtitle')
      : route.name === 'AddTransaction'
        ? t('quickAdd.transactionSubtitle')
        : t('quickAdd.creditCardSubtitle');

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22
  }
});
