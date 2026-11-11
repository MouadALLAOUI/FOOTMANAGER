import { Platform, type ViewStyle } from 'react-native';

export const shadows: Record<'sm' | 'md' | 'lg' | 'none', ViewStyle> = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: '#101418',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: { elevation: 2 },
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#101418',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: { elevation: 4 },
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#101418',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: { elevation: 8 },
  }) as ViewStyle,
};
