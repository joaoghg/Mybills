import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '@/core/theme';

type AuthHeaderProps = {
  theme: AppTheme;
};

export function AuthHeader({ theme }: AuthHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.logoSection}>
        <Image
          source={require('../../../assets/mybills-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('auth.title')}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('auth.subtitle')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 6
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 6
  },
  logo: {
    width: 88,
    height: 88
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  }
});
