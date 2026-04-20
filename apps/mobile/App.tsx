import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/core/theme';

import './src/core/i18n';
import { AuthScreen } from './src/features/auth/screens/auth-screen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { theme, resolvedMode } = useTheme();

  const statusBarStyle = resolvedMode === 'dark' ? 'light' : 'dark';

  return (
    <>
      <AuthScreen theme={theme} />
      <StatusBar style={statusBarStyle} />
    </>
  );
}
