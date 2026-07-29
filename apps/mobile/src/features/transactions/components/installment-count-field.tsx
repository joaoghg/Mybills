import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppTheme } from '@/core/theme';

const MIN_INSTALLMENTS = 2;
const MAX_INSTALLMENTS = 360;
const MAX_DIGITS = 3;

type Props = {
  theme: AppTheme;
  value: number | null;
  label: string;
  placeholder: string;
  suffix: string;
  decrementLabel: string;
  incrementLabel: string;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
};

function parseCount(text: string, max: number): number | null {
  const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  if (parsed <= 0) {
    return null;
  }

  return Math.min(parsed, max);
}

type StepperProps = {
  theme: AppTheme;
  glyph: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
};

function StepperButton({ theme, glyph, accessibilityLabel, disabled, onPress }: StepperProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepper,
        { backgroundColor: theme.colors.surfaceAlt },
        disabled && styles.stepperDisabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={[styles.stepperGlyph, { color: theme.colors.textPrimary }]}>{glyph}</Text>
    </Pressable>
  );
}

export function InstallmentCountField({
  theme,
  value,
  label,
  placeholder,
  suffix,
  decrementLabel,
  incrementLabel,
  onChange,
  min = MIN_INSTALLMENTS,
  max = MAX_INSTALLMENTS
}: Props) {
  const canDecrement = value !== null && value > min;
  const canIncrement = value === null || value < max;

  function handleChangeText(text: string) {
    onChange(parseCount(text, max));
  }

  function handleDecrement() {
    if (value === null) {
      return;
    }
    onChange(Math.max(min, value - 1));
  }

  function handleIncrement() {
    onChange(value === null ? min : Math.min(max, value + 1));
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
        ]}
      >
        <StepperButton
          theme={theme}
          glyph="−"
          accessibilityLabel={decrementLabel}
          disabled={!canDecrement}
          onPress={handleDecrement}
        />
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          maxLength={MAX_DIGITS}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          selectTextOnFocus
          style={[styles.input, { color: theme.colors.textPrimary }]}
          value={value === null ? '' : String(value)}
          onChangeText={handleChangeText}
        />
        <Text style={[styles.suffix, { color: theme.colors.textSecondary }]}>{suffix}</Text>
        <StepperButton
          theme={theme}
          glyph="+"
          accessibilityLabel={incrementLabel}
          disabled={!canIncrement}
          onPress={handleIncrement}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    gap: 6
  },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperDisabled: {
    opacity: 0.45
  },
  stepperGlyph: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800'
  },
  pressed: {
    opacity: 0.92
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700'
  },
  suffix: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  }
});
