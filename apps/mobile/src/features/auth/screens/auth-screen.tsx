import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';
import { AuthHeader } from '@/features/auth/components/auth-header';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { SignupScreen } from '@/features/auth/screens/signup-screen';

type AuthMode = 'login' | 'signup';

type AuthScreenProps = {
  theme: AppTheme;
  onAuthenticated?: () => void;
};

export function AuthScreen({ theme, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background },
        {
          paddingHorizontal: 20,
          paddingBottom: insets.bottom
        }
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <AuthHeader theme={theme} />

        <View style={styles.formContainer}>
          {mode === 'signup' ? (
            <SignupScreen
              theme={theme}
              onSwitchToLogin={() => setMode('login')}
              onAuthenticated={onAuthenticated}
            />
          ) : (
            <LoginScreen
              theme={theme}
              onSwitchToSignup={() => setMode('signup')}
              onLoginSuccess={() => {
                onAuthenticated?.();
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  root: {
    flex: 1,
    overflow: 'hidden'
  },
  formContainer: {
    flex: 1
  }
});
