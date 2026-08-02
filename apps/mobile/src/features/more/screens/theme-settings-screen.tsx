import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useUserPreferences } from '@/core/preferences';
import { useTheme, type ThemeMode } from '@/core/theme';
import type { RootStackParamList } from '@/navigation/types';

export function ThemeSettingsScreen() {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setThemeMode } = useUserPreferences();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('more.themeScreenTitle') });
  }, [navigation, t]);

  async function pick(next: ThemeMode) {
    await setThemeMode(next);
    navigation.goBack();
  }

  const modes: ThemeMode[] = ['light', 'dark', 'system'];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.list}>
        {modes.map((m) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            onPress={() => pick(m)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.colors.surface,
                borderColor: mode === m ? theme.colors.primary : theme.colors.border
              },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              {m === 'light'
                ? t('onboarding.themeLight')
                : m === 'dark'
                  ? t('onboarding.themeDark')
                  : t('onboarding.themeSystem')}
            </Text>
          </Pressable>
        ))}
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
