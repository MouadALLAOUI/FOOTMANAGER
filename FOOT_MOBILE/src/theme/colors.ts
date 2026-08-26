export const palette = {
  green: '#22c55e',
  greenDark: '#16a34a',
  greenLight: '#dcfce7',
  dark: '#0f172a',
  darkCard: '#1e293b',
  darkBorder: '#334155',
  darkMuted: '#64748b',
  light: '#f8fafc',
  lightCard: '#ffffff',
  lightBorder: '#e2e8f0',
  lightMuted: '#94a3b8',
  muted: '#94a3b8',
  mutedDark: '#64748b',
  danger: '#f43f5e',
  dangerDark: '#e11d48',
  dangerLight: '#ffe4e6',
  amber: '#f59e0b',
  amberDark: '#d97706',
  amberLight: '#fef3c7',
  blue: '#3b82f6',
  blueDark: '#2563eb',
  blueLight: '#dbeafe',
  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(15, 23, 42, 0.04)',
} as const;

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgMuted: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  danger: string;
  dangerPressed: string;
  amber: string;
  success: string;
  muted: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  bg: '#f1f5f9',
  bgMuted: '#e2e8f0',
  surface: palette.lightCard,
  surfaceHover: '#f8fafc',
  border: palette.lightBorder,
  borderStrong: '#cbd5e1',
  text: '#0f172a',
  textMuted: palette.mutedDark,
  textSubtle: '#94a3b8',
  textOnPrimary: '#ffffff',
  primary: palette.green,
  primaryPressed: palette.greenDark,
  danger: palette.danger,
  dangerPressed: palette.dangerDark,
  amber: palette.amber,
  success: palette.green,
  muted: palette.muted,
  overlay: palette.overlay,
};

export const darkColors: ThemeColors = {
  bg: palette.dark,
  bgMuted: '#1e293b',
  surface: palette.darkCard,
  surfaceHover: '#334155',
  border: palette.darkBorder,
  borderStrong: '#475569',
  text: palette.light,
  textMuted: palette.muted,
  textSubtle: '#64748b',
  textOnPrimary: '#ffffff',
  primary: palette.green,
  primaryPressed: palette.greenDark,
  danger: palette.danger,
  dangerPressed: '#fb7185',
  amber: palette.amber,
  success: palette.green,
  muted: palette.muted,
  overlay: palette.overlay,
};
