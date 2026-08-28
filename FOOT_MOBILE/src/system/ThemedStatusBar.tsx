import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme/ThemeProvider';

export function ThemedStatusBar(): React.JSX.Element {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
