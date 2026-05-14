import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import type { AppTheme } from '@/core/theme';

type SkeletonBoxProps = {
  theme: AppTheme;
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBox({
  theme,
  width = '100%',
  height,
  borderRadius = 8,
  style
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad)
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad)
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceAlt,
          opacity
        },
        style
      ]}
    />
  );
}
