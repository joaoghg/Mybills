import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveDeviceLanguage } from '@/core/i18n/i18n';
import type { AppLanguage } from '@/core/i18n/resources';
import { useUserPreferences } from '@/core/preferences';
import { useTheme, type ThemeMode } from '@/core/theme';

const TOTAL_STEPS = 3;

export function OnboardingFlowScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setLanguage, setThemeMode, completeOnboarding } = useUserPreferences();

  const [step, setStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(() => resolveDeviceLanguage());
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('system');

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const pickLanguage = useCallback(
    async (lng: AppLanguage) => {
      setSelectedLanguage(lng);
      await setLanguage(lng);
    },
    [setLanguage]
  );

  const pickTheme = useCallback(
    async (mode: ThemeMode) => {
      setSelectedTheme(mode);
      await setThemeMode(mode);
    },
    [setThemeMode]
  );

  const handleFinish = useCallback(async () => {
    await completeOnboarding({ language: selectedLanguage, themeMode: selectedTheme });
  }, [completeOnboarding, selectedLanguage, selectedTheme]);

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20 }
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {step === 0 ? (
          <>
            <Image
              source={require('../../../assets/mybills-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {t('onboarding.welcomeTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('onboarding.welcomeSubtitle')}
            </Text>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {t('onboarding.languageTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('onboarding.languageSubtitle')}
            </Text>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {t('onboarding.themeTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('onboarding.themeSubtitle')}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.body}>
        {step === 1 ? (
          <View style={styles.options}>
            <Pressable
              accessibilityRole="button"
              onPress={() => pickLanguage('pt-BR')}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selectedLanguage === 'pt-BR' ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                {t('onboarding.languagePtBR')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => pickLanguage('en-US')}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selectedLanguage === 'en-US' ? theme.colors.primary : theme.colors.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                {t('onboarding.languageEnUS')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.options}>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                onPress={() => pickTheme(mode)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: selectedTheme === mode ? theme.colors.primary : theme.colors.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.optionLabel, { color: theme.colors.textPrimary }]}>
                  {mode === 'light'
                    ? t('onboarding.themeLight')
                    : mode === 'dark'
                      ? t('onboarding.themeDark')
                      : t('onboarding.themeSystem')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, step === 0 && styles.footerSingle]}>
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.secondaryLabel, { color: theme.colors.textPrimary }]}>
              {t('onboarding.back')}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={isLastStep ? handleFinish : goNext}
          style={({ pressed }) => [
            styles.primaryButton,
            step === 0 && styles.primaryButtonFullWidth,
            { backgroundColor: theme.colors.primary },
            pressed && styles.pressed
          ]}
        >
          <Text style={[styles.primaryLabel, { color: theme.colors.textOnPrimary }]}>
            {isLastStep ? t('onboarding.finish') : t('onboarding.continue')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20
  },
  header: {
    gap: 10,
    marginBottom: 8
  },
  logo: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center'
  },
  body: {
    flex: 1,
    justifyContent: 'center'
  },
  options: {
    gap: 12
  },
  optionCard: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 18,
    justifyContent: 'center'
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  footerSingle: {
    flexDirection: 'column'
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  primaryButtonFullWidth: {
    flex: 0,
    alignSelf: 'stretch'
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700'
  },
  pressed: {
    opacity: 0.92
  }
});
