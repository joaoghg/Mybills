import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { AppTheme } from '@/core/theme';

export type InputFieldProps = TextInputProps & {
  theme: AppTheme;
  label: string;
  rightAccessory?: ReactNode;
};

export function InputField({
  theme,
  label,
  style,
  rightAccessory,
  ...props
}: InputFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border
          },
          rightAccessory ? styles.inputShellWithAccessory : styles.inputShellNoAccessory
        ]}
      >
        <TextInput
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { color: theme.colors.textPrimary }, style]}
          {...props}
        />
        {rightAccessory ? (
          <View style={styles.rightAccessorySlot}>{rightAccessory}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 54,
    paddingLeft: 16
  },
  inputShellNoAccessory: {
    paddingRight: 16
  },
  inputShellWithAccessory: {
    paddingRight: 4
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingVertical: 14,
    paddingRight: 8,
    fontSize: 16,
    fontWeight: '500'
  },
  rightAccessorySlot: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 6,
    minWidth: 44
  }
});
