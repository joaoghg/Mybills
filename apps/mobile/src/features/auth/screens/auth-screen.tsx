import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '../../../core/theme';
import { AuthHeader } from '../components/auth-header';
import { LoginScreen } from './login-screen';
import { SignupScreen } from './signup-screen';

type AuthMode = 'login' | 'signup';

type AuthScreenProps = {
  theme: AppTheme;
};

export function AuthScreen({ theme }: AuthScreenProps) {
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
            <SignupScreen theme={theme} onSwitchToLogin={() => setMode('login')} />
          ) : (
            <LoginScreen theme={theme} onSwitchToSignup={() => setMode('signup')} />
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
