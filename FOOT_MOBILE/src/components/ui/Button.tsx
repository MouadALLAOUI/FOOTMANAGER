import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes } from '@/theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
  style,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const height =
    size === 'sm' ? sizes.buttonHeightSm : size === 'lg' ? sizes.buttonHeightLg : sizes.buttonHeightMd;

  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.bgMuted
          : 'transparent';
  const borderColor = variant === 'outline' ? colors.borderStrong : 'transparent';
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textOnPrimary
      : variant === 'ghost'
        ? colors.text
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={sizes.hitSlop}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
          height,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          transform: pressed && !isDisabled ? [{ scale: 0.98 }] : [],
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: sizes.touchTarget,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  icon: { justifyContent: 'center', alignItems: 'center' },
});
