import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import type { AppTheme } from '@/core/theme';
import { useQuickAddMenu } from '@/navigation/quick-add-menu-context';

type AddTabButtonProps = BottomTabBarButtonProps & {
  theme: AppTheme;
};

const FAB_SCALE_PRESSED = 0.88;

export function AddTabButton({
  theme,
  accessibilityLabel,
  style,
  testID,
  onLongPress,
  delayLongPress
}: AddTabButtonProps) {
  const { isOpen, toggle } = useQuickAddMenu();
  const scale = useRef(new Animated.Value(1)).current;

  function runScale(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 220
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      style={[styles.wrapper, style]}
      onPressIn={() => runScale(FAB_SCALE_PRESSED)}
      onPressOut={() => runScale(1)}
      onPress={toggle}
    >
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary, transform: [{ scale }] }
        ]}
      >
        <Ionicons name="add" size={28} color={theme.colors.textOnPrimary} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  }
});
