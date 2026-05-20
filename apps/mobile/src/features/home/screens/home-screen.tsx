import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

export function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24
        }
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('home.title')}</Text>
      <Text style={[styles.placeholder, { color: theme.colors.textSecondary }]}>
        {t('home.placeholder')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 12
  },
  title: {
    fontSize: 28,
    fontWeight: '800'
  },
  placeholder: {
    fontSize: 16,
    lineHeight: 22
  }
});
