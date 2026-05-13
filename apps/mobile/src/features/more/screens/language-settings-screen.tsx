import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { i18next } from '@/core/i18n/i18n';
import type { AppLanguage } from '@/core/i18n/resources';
import { useUserPreferences } from '@/core/preferences';
import { useTheme } from '@/core/theme';
import type { RootStackParamList } from '@/navigation/types';

export function LanguageSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setLanguage } = useUserPreferences();
  const current = (i18next.language as AppLanguage) || 'pt-BR';

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('more.languageScreenTitle') });
  }, [navigation, t]);

  async function pick(lng: AppLanguage) {
    await setLanguage(lng);
    navigation.goBack();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          onPress={() => pick('pt-BR')}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: theme.colors.surface,
              borderColor: current === 'pt-BR' ? theme.colors.primary : theme.colors.border
            },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            {t('onboarding.languagePtBR')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => pick('en-US')}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: theme.colors.surface,
              borderColor: current === 'en-US' ? theme.colors.primary : theme.colors.border
            },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
            {t('onboarding.languageEnUS')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  list: {
    gap: 12
  },
  row: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 18,
    justifyContent: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.92
  }
});
