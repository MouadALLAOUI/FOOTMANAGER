import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/theme/colors';

export function baseTabScreenOptions(colors: ThemeColors, activeColor?: string) {
  const active = activeColor || colors.primary;
  return {
    headerShown: false,
    tabBarActiveTintColor: active,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 6,
      paddingBottom: 8,
      height: 64,
    },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '700' as const },
  };
}

