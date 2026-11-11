import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { type StatusColorKey } from '@/theme/colors';
import { radius } from '@/theme/spacing';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'lime'
  | StatusColorKey;

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const colorMap: Record<BadgeVariant, { main: string; bg: string }> = {
  // Status colors
  available: { main: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  pending: { main: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  booked: { main: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  cancelled: { main: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
  approved: { main: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  rejected: { main: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },

  // Generic variants
  neutral: { main: '#4B5563', bg: '#E2E6E9' },
  success: { main: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  warning: { main: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  danger: { main: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },
  info: { main: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  lime: { main: '#101418', bg: '#A8FF24' },
};

export function Badge({ label, variant = 'neutral', style }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const config = colorMap[variant] ?? colorMap.neutral;
  const bg = isDark ? (variant === 'lime' ? '#A8FF24' : `${config.main}25`) : config.bg;
  const dotColor = variant === 'lime' ? '#101418' : config.main;
  const textColor = variant === 'lime' ? '#101418' : isDark && variant === 'neutral' ? '#F2F4F5' : config.main;

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
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
