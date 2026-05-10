import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { i18next } from '../../../core/i18n/i18n';
import type { AppTheme } from '../../../core/theme';

type AuthHeaderProps = {
  theme: AppTheme;
};

export function AuthHeader({ theme }: AuthHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentLanguage = (i18next.language as 'pt-BR' | 'en-US') || 'pt-BR';

  const changeLanguage = async (language: 'pt-BR' | 'en-US') => {
    await i18next.changeLanguage(language);
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.logoSection}>
        <Image
          source={require('../../../assets/mybills-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.languageButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.languagePtBR')}
            onPress={() => changeLanguage('pt-BR')}
            style={[
              styles.languageIconButton,
              {
                backgroundColor:
                  currentLanguage === 'pt-BR' ? theme.colors.surfaceAlt : 'transparent',
                borderColor: theme.colors.border
              }
            ]}
          >
            <Text style={[styles.languageIcon, { color: theme.colors.textPrimary }]}>🇧🇷</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.languageUS')}
            onPress={() => changeLanguage('en-US')}
            style={[
              styles.languageIconButton,
              {
                backgroundColor:
                  currentLanguage === 'en-US' ? theme.colors.surfaceAlt : 'transparent',
                borderColor: theme.colors.border
              }
            ]}
          >
            <Text style={[styles.languageIcon, { color: theme.colors.textPrimary }]}>🇺🇸</Text>
          </Pressable>
        </View>
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
    gap: 12,
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
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center'
  },
  languageIconButton: {
    borderWidth: 1,
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  languageIcon: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700'
  }
});
