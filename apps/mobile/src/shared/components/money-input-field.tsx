import type { TextInputProps } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { InputField } from '@/shared/components/input-field';
import {
  applyMoneyInputChange,
  centsToMoneyDigits,
  DEFAULT_MAX_MONEY_DIGITS,
  formatMoneyDigits,
  moneyDigitsToCents
} from '@/shared/utils/money-input';

export type MoneyInputFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  theme: AppTheme;
  label: string;
  cents: number;
  onChangeCents: (cents: number) => void;
  maxDigits?: number;
};

export function MoneyInputField({
  theme,
  label,
  cents,
  onChangeCents,
  maxDigits = DEFAULT_MAX_MONEY_DIGITS,
  placeholder = '0,00',
  ...textInputProps
}: MoneyInputFieldProps) {
  const digits = centsToMoneyDigits(cents);
  const displayValue = formatMoneyDigits(digits);

  function handleChangeText(text: string) {
    const nextDigits = applyMoneyInputChange({
      previousDigits: digits,
      incomingText: text,
      maxDigits
    });
    onChangeCents(moneyDigitsToCents(nextDigits));
  }

  return (
    <InputField
      theme={theme}
      label={label}
      value={displayValue}
      onChangeText={handleChangeText}
      keyboardType="number-pad"
      placeholder={placeholder}
      {...textInputProps}
    />
  );
}
