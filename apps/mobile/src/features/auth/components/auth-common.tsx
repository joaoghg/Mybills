import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AppTheme } from '../../../core/theme';

type AuthDividerProps = {
  theme: AppTheme;
};

export function AuthDivider({ theme }: AuthDividerProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.dividerRow}>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
        {t('auth.or')}
      </Text>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

type GoogleButtonProps = {
  theme: AppTheme;
};

export function GoogleButton({ theme }: GoogleButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      style={[
        styles.googleButton,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }
      ]}
    >
      <Text style={[styles.googleButtonIcon, { color: theme.colors.textPrimary }]}>G</Text>
      <Text style={[styles.googleButtonText, { color: theme.colors.textPrimary }]}>
        {t('auth.googleButton')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4
  },
  divider: {
    flex: 1,
    height: 1
  },
  dividerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18
  },
  googleButtonIcon: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900'
  },
  googleButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700'
  }
});
