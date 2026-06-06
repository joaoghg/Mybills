import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/core/theme';

const ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * WHEEL_VISIBLE_COUNT;
const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_COUNT / 2);
const YEAR_RANGE = 30;

type HistoryMonthYearPickerSheetProps = {
  theme: AppTheme;
  visible: boolean;
  title: string;
  doneLabel: string;
  locale: string;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onConfirm: (month: number, year: number) => void;
};

type WheelColumnProps = {
  theme: AppTheme;
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  resetKey: string;
};

function WheelColumn({ theme, items, selectedIndex, onIndexChange, resetKey }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [resetKey, selectedIndex]);

  function snapToIndex(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    onIndexChange(index);
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  }

  return (
    <View style={styles.wheelColumn}>
      <ScrollView
        ref={scrollRef}
        key={resetKey}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}
        onMomentumScrollEnd={snapToIndex}
        onScrollEndDrag={snapToIndex}
      >
        {items.map((label, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={`${label}-${index}`} style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemLabel,
                  {
                    color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500'
                  }
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View
        pointerEvents="none"
        style={[styles.wheelHighlight, { borderColor: theme.colors.border }]}
      />
    </View>
  );
}

function buildMonthLabels(locale: string): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(2024, index, 1);
    try {
      return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
    } catch {
      return String(index + 1);
    }
  });
}

function buildYearRange(selectedYear: number): number[] {
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear, selectedYear);
  const minYear = Math.min(maxYear - YEAR_RANGE, selectedYear);
  const years: number[] = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    years.push(year);
  }

  return years;
}

export function HistoryMonthYearPickerSheet({
  theme,
  visible,
  title,
  doneLabel,
  locale,
  selectedMonth,
  selectedYear,
  onClose,
  onConfirm
}: HistoryMonthYearPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const monthLabels = useMemo(() => buildMonthLabels(locale), [locale]);
  const years = useMemo(() => buildYearRange(selectedYear), [selectedYear]);

  const [draftMonth, setDraftMonth] = useState(selectedMonth);
  const [draftYear, setDraftYear] = useState(selectedYear);

  useEffect(() => {
    if (visible) {
      setDraftMonth(selectedMonth);
      setDraftYear(selectedYear);
    }
  }, [visible, selectedMonth, selectedYear]);

  const draftYearIndex = Math.max(0, years.indexOf(draftYear));

  function handleYearIndexChange(index: number) {
    const year = years[index];
    if (year !== undefined) {
      setDraftYear(year);
    }
  }

  function handleConfirm() {
    onConfirm(draftMonth, draftYear);
    onClose();
  }

  const resetKey = `${visible}-${selectedMonth}-${selectedYear}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: insets.bottom + 20
            }
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>

          <View style={styles.wheelsRow}>
            <WheelColumn
              theme={theme}
              items={monthLabels}
              selectedIndex={draftMonth - 1}
              onIndexChange={(index) => setDraftMonth(index + 1)}
              resetKey={`month-${resetKey}`}
            />
            <WheelColumn
              theme={theme}
              items={years.map(String)}
              selectedIndex={draftYearIndex}
              onIndexChange={handleYearIndexChange}
              resetKey={`year-${resetKey}`}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleConfirm}
            style={[styles.doneBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.doneLabel, { color: theme.colors.textOnPrimary }]}>{doneLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  wheelsRow: {
    flexDirection: 'row',
    gap: 8
  },
  wheelColumn: {
    flex: 1,
    height: WHEEL_HEIGHT,
    position: 'relative'
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  wheelItemLabel: {
    fontSize: 17,
    textTransform: 'capitalize'
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_PADDING,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  doneBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
