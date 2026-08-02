import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/core/i18n/i18n';

import { HttpClientProvider } from '@/core/api/http-client-provider';
import { UserPreferencesProvider, useUserPreferences } from '@/core/preferences';
import { AppQueryProvider } from '@/core/query/query-provider';
import { AuthSessionProvider, useAuthSession } from '@/core/session/auth-session-provider';
import { ThemeProvider, useTheme } from '@/core/theme';
import { useOtaUpdates } from '@/core/updates';
import { OnboardingFlowScreen } from '@/features/onboarding/screens/onboarding-flow-screen';
import { AuthenticatedRoot } from '@/navigation/root-navigator';
import { AuthScreen } from '@/features/auth/screens/auth-screen';

export default function App() {
  useOtaUpdates();

  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <AuthSessionProvider>
          <HttpClientProvider>
            <ThemeProvider>
              <UserPreferencesProvider>
                <ThemedApp />
              </UserPreferencesProvider>
            </ThemeProvider>
          </HttpClientProvider>
        </AuthSessionProvider>
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { theme, resolvedMode } = useTheme();
  const { status, markSignedIn } = useAuthSession();
  const { hydrated, onboardingCompleted } = useUserPreferences();

  const statusBarStyle = resolvedMode === 'dark' ? 'light' : 'dark';

  if (status === 'loading' || !hydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return (
      <>
        <OnboardingFlowScreen />
        <StatusBar style={statusBarStyle} />
      </>
    );
  }

  return (
    <>
      {status === 'guest' ? (
        <AuthScreen theme={theme} onAuthenticated={markSignedIn} />
      ) : (
        <AuthenticatedRoot />
      )}
      <StatusBar style={statusBarStyle} />
    </>
  );
}
