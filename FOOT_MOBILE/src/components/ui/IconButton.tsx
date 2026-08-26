import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes } from '@/theme/spacing';

interface Props {
  icon: ReactNode;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'primary';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const dim = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const isDisabled = disabled || loading;
  const bg =
    variant === 'primary' ? colors.primary : variant === 'outline' ? 'transparent' : 'transparent';
  const borderColor = variant === 'outline' ? colors.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={sizes.hitSlop}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.text} /> : icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center' },
});
