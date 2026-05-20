import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';
import { AppScreenHeader } from '@/shared/components/app-screen-header';
import { firstNameFromUserName, useCurrentUser } from '@/shared/hooks/use-current-user';

export function HistoryScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userQuery = useCurrentUser();

  const firstName = firstNameFromUserName(userQuery.data?.name);
  const greeting =
    firstName.length > 0 ? t('home.greeting', { name: firstName }) : undefined;

  const scrollContent = {
    paddingHorizontal: 20,
    paddingTop: insets.top + 12,
    paddingBottom: insets.bottom + 32,
    flexGrow: 1
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppScreenHeader
        theme={theme}
        greeting={greeting}
        isLoadingGreeting={userQuery.isPending}
      />
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('history.title')}</Text>
      <Text style={[styles.placeholder, { color: theme.colors.textSecondary }]}>
        {t('history.placeholder')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8
  },
  placeholder: {
    fontSize: 16,
    lineHeight: 22
  }
});
