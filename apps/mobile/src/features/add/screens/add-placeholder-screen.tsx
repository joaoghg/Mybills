import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/theme';

export function AddPlaceholderScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('add.subtitle')}
      </Text>
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
