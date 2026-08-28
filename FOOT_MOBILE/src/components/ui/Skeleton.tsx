import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radiusValue?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radiusValue = radius.sm, style }: SkeletonProps): React.JSX.Element {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radiusValue, backgroundColor: colors.bgMuted, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
