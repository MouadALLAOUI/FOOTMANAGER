import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from './colors';

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode | null) => void;
  isRTL: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = null,
}: {
  children: ReactNode;
  initialMode?: ThemeMode | null;
}): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(initialMode);

  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const colors = mode === 'dark' ? darkColors : lightColors;
  const { isRTL } = useI18n();

  const setMode = useCallback((next: ThemeMode | null) => {
    setOverride(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, isDark: mode === 'dark', setMode, isRTL }),
    [colors, mode, setMode, isRTL],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
