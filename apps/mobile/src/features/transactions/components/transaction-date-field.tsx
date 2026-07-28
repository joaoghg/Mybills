import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { ymdFromLocalDate } from '@/shared/lib/billing-cycle';

type Props = {
  theme: AppTheme;
  valueYmd: string;
  locale: string;
  onChangeYmd: (ymd: string) => void;
  label?: string;
  minimumDateYmd?: string;
};

function ymdToLocalDate(ymd: string): Date {
  const parts = ymd.split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function formatDateLabel(ymd: string, locale: string): string {
  const date = ymdToLocalDate(ymd);
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return ymd;
  }
}

export function TransactionDateField({
  theme,
  valueYmd,
  locale,
  onChangeYmd,
  label,
  minimumDateYmd
}: Props) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  const pickerDate = useMemo(() => ymdToLocalDate(valueYmd), [valueYmd]);
  const displayLabel = useMemo(() => formatDateLabel(valueYmd, locale), [valueYmd, locale]);
  const minimumDate = useMemo(
    () => (minimumDateYmd ? ymdToLocalDate(minimumDateYmd) : undefined),
    [minimumDateYmd]
  );

  function handleChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChangeYmd(ymdFromLocalDate(selectedDate));
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
        {label ?? t('transactions.dateLabel')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? t('transactions.dateLabel')}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          },
          pressed && styles.fieldPressed
        ]}
      >
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{displayLabel}</Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      ) : null}
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
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  fieldPressed: {
    opacity: 0.92
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600'
  }
});
