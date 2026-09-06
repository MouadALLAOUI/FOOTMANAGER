import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { palette, statusColors, type StatusColorKey } from '@/theme/colors';
import { radius } from '@/theme/spacing';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | StatusColorKey;

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const colorMap: Record<BadgeVariant, { main: string; bg: string }> = {
  // Status colors
  available: { main: statusColors.available, bg: `${statusColors.available}18` },
  pending: { main: statusColors.pending, bg: `${statusColors.pending}18` },
  booked: { main: statusColors.booked, bg: `${statusColors.booked}18` },
  cancelled: { main: statusColors.cancelled, bg: `${statusColors.cancelled}18` },
  approved: { main: statusColors.approved, bg: `${statusColors.approved}18` },
  rejected: { main: statusColors.rejected, bg: `${statusColors.rejected}18` },

  // Generic variants
  neutral: { main: '#64748B', bg: '#F1F5F9' },
  success: { main: statusColors.approved, bg: `${statusColors.approved}18` },
  warning: { main: statusColors.pending, bg: `${statusColors.pending}18` },
  danger: { main: statusColors.booked, bg: `${statusColors.booked}18` },
  info: { main: palette.accentBlue, bg: `${palette.accentBlue}18` },
};

export function Badge({ label, variant = 'neutral', style }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const config = colorMap[variant] ?? colorMap.neutral;
  const bg = isDark ? `${config.main}2A` : config.bg;
  const dotColor = config.main;
  const textColor = isDark ? (variant === 'neutral' ? '#E2E8F0' : config.main) : config.main;

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

