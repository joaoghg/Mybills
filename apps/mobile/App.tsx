import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/core/i18n/i18n';

import { HttpClientProvider } from '@/core/api/http-client-provider';
import { AppQueryProvider } from '@/core/query/query-provider';
import { AuthSessionProvider, useAuthSession } from '@/core/session/auth-session-provider';
import { ThemeProvider, useTheme } from '@/core/theme';
import { AuthenticatedRoot } from '@/navigation/root-navigator';
import { AuthScreen } from '@/features/auth/screens/auth-screen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <AuthSessionProvider>
          <HttpClientProvider>
            <ThemeProvider>
              <ThemedApp />
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

  const statusBarStyle = resolvedMode === 'dark' ? 'light' : 'dark';

  if (status === 'loading') {
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
