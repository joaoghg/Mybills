import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

type HistorySearchBarProps = {
  theme: AppTheme;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

export function HistorySearchBar({ theme, value, placeholder, onChangeText }: HistorySearchBarProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
      ]}
    >
      <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { color: theme.colors.textPrimary }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0
  }
});
