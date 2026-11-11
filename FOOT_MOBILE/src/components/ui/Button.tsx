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
  const { colors, isDark } = useTheme();
  const isDisabled = disabled || loading;
  const height =
    size === 'sm' ? sizes.buttonHeightSm : size === 'lg' ? sizes.buttonHeightLg : sizes.buttonHeightMd;

  const bg =
    variant === 'primary'
      ? colors.primary // Lime #A8FF24
      : variant === 'secondary'
        ? (isDark ? '#252B31' : '#101418') // Charcoal Black
        : variant === 'danger'
          ? colors.danger
          : 'transparent';

  const borderColor =
    variant === 'outline'
      ? colors.borderStrong
      : 'transparent';

  const borderWidth = variant === 'outline' ? 1.5 : 0;

  const textColor =
    variant === 'primary'
      ? colors.textOnPrimary // Charcoal Black #101418 on Lime
      : variant === 'secondary' || variant === 'danger'
        ? '#FFFFFF'
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
          borderWidth,
          height,
          borderRadius: radius.medium,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
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
    borderRadius: radius.medium,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: sizes.touchTarget,
    minWidth: sizes.touchTarget,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  icon: { justifyContent: 'center', alignItems: 'center' },
});
