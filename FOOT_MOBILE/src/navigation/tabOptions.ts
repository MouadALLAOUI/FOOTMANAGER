import type { ThemeColors } from '@/theme/colors';

export function baseTabScreenOptions(colors: ThemeColors) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 0.5,
      paddingTop: 4,
      height: 60,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };
}
