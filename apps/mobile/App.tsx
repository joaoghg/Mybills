import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeProvider, useTheme } from './src/core/theme';

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { theme, resolvedMode, mode, setMode, toggleMode } = useTheme();

  const statusBarStyle = resolvedMode === 'dark' ? 'light' : 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background
        }
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>MyBills Theme</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Modo selecionado: {mode}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Modo aplicado: {resolvedMode}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.secondary
              }
            ]}
            onPress={toggleMode}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textOnSecondary }]}>
              Alternar
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.outlineButton,
              {
                borderColor: theme.colors.border
              }
            ]}
            onPress={() => setMode('system')}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.textPrimary }]}>
              Sistema
            </Text>
          </Pressable>
        </View>
      </View>

      <StatusBar style={statusBarStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8
  },
  body: {
    fontSize: 16,
    fontWeight: '500'
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12
  },
  button: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700'
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
