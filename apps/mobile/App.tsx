import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/core/i18n';
import { HttpClientProvider } from './src/core/api/http-client-provider';
import { AppQueryProvider } from './src/core/query/query-provider';
import { AuthSessionProvider, useAuthSession } from './src/core/session/auth-session-provider';
import { ThemeProvider, useTheme } from './src/core/theme';
import { AuthScreen } from './src/features/auth/screens/auth-screen';
import { HomePlaceholderScreen } from './src/features/home/screens/home-placeholder-screen';

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
        <HomePlaceholderScreen theme={theme} />
      )}
      <StatusBar style={statusBarStyle} />
    </>
  );
}
