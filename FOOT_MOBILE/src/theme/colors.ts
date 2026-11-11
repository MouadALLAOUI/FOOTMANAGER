export const palette = {
  // ── Approved Core Football Palette ──
  primaryLime: '#A8FF24',
  primaryLimePressed: '#96E81D',
  primaryLimeDim: 'rgba(168, 255, 36, 0.15)',
  primaryLimeGlow: 'rgba(168, 255, 36, 0.35)',

  charcoalBlack: '#101418',
  charcoalSurface: '#161B22',
  charcoalCard: '#1C2229',

  darkGray: '#252B31',
  darkGrayHover: '#2E363E',
  darkGrayMuted: '#4B5563',

  lightGrayBg: '#F2F4F5',
  lightGraySurface: '#FFFFFF',
  lightGrayBorder: '#E2E6E9',
  lightGrayBorderStrong: '#CCD2D8',

  white: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F2F4F5',

  // ── Aliases & Backward Compatibility ──
  primaryGreen: '#A8FF24',
  actionGreen: '#A8FF24',
  deepGreen: '#101418',
  darkGreen: '#252B31',
  darkNavy: '#101418',
  navy: '#101418',
  accentBlue: '#3B82F6',
  skyBlue: '#38BDF8',
  lightBlueSurface: '#EAF7FF',
  selectedGreenSurface: 'rgba(168, 255, 36, 0.12)',

  // ── Status Colors ──
  available: '#10B981',
  pending: '#F59E0B',
  booked: '#EF4444',
  cancelled: '#6B7280',
  approved: '#10B981',
  rejected: '#DC2626',

  // ── Extended Colors ──
  green: '#10B981',
  greenDark: '#059669',
  greenLight: '#D1FAE5',
  dark: '#101418',
  darkCard: '#1C2229',
  darkBorder: '#2E363E',
  darkMuted: '#64748B',
  light: '#F2F4F5',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E6E9',
  lightMuted: '#8B95A1',
  muted: '#64748B',
  mutedDark: '#475569',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#FEE2E2',
  amber: '#F59E0B',
  amberDark: '#D97706',
  amberLight: '#FEF3C7',
  blue: '#3B82F6',
  blueDark: '#1D4ED8',
  blueLight: '#DBEAFE',
  overlay: 'rgba(16, 20, 24, 0.65)',
  overlayLight: 'rgba(16, 20, 24, 0.05)',
} as const;

export const statusColors = {
  available: palette.available,
  pending: palette.pending,
  booked: palette.booked,
  cancelled: palette.cancelled,
  approved: palette.approved,
  rejected: palette.rejected,
} as const;

export type StatusColorKey = keyof typeof statusColors;

export const roleAccents = {
  player: palette.primaryLime,
  manager: palette.charcoalBlack,
  terrain_owner: palette.primaryLime,
  committee: palette.accentBlue,
  admin: palette.charcoalBlack,
} as const;

export type RoleAccentKey = keyof typeof roleAccents;

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgMuted: string;
  surface: string;
  surfaceHover: string;
  surfaceCard: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  textOnDark: string;
  primary: string;
  primaryDark: string;
  primaryPressed: string;
  primaryMuted: string;
  charcoal: string;
  darkGray: string;
  lime: string;
  navy: string;
  accentBlue: string;
  danger: string;
  dangerPressed: string;
  amber: string;
  success: string;
  muted: string;
  overlay: string;
  overlayLight: string;
  // Status tokens
  statusAvailable: string;
  statusPending: string;
  statusBooked: string;
  statusCancelled: string;
  statusApproved: string;
  statusRejected: string;
}

export const lightColors: ThemeColors = {
  bg: '#F2F4F5',
  bgMuted: '#E8EBED',
  surface: '#FFFFFF',
  surfaceHover: '#F8F9FA',
  surfaceCard: '#FFFFFF',
  border: '#E2E6E9',
  borderStrong: '#CCD2D8',
  text: '#101418',
  textMuted: '#4B5563',
  textSubtle: '#8B95A1',
  textOnPrimary: '#101418', // High contrast black on lime
  textOnDark: '#FFFFFF',
  primary: '#A8FF24',
  primaryDark: '#8DE615',
  primaryPressed: '#96E81D',
  primaryMuted: 'rgba(168, 255, 36, 0.15)',
  charcoal: '#101418',
  darkGray: '#252B31',
  lime: '#A8FF24',
  navy: '#101418',
  accentBlue: '#3B82F6',
  danger: '#EF4444',
  dangerPressed: '#DC2626',
  amber: '#F59E0B',
  success: '#10B981',
  muted: '#64748B',
  overlay: 'rgba(16, 20, 24, 0.65)',
  overlayLight: 'rgba(16, 20, 24, 0.05)',
  statusAvailable: palette.available,
  statusPending: palette.pending,
  statusBooked: palette.booked,
  statusCancelled: palette.cancelled,
  statusApproved: palette.approved,
  statusRejected: palette.rejected,
};

export const darkColors: ThemeColors = {
  bg: '#101418',
  bgMuted: '#161B22',
  surface: '#1C2229',
  surfaceHover: '#252B31',
  surfaceCard: '#20272F',
  border: '#2E363E',
  borderStrong: '#3D4752',
  text: '#F2F4F5',
  textMuted: '#9DA6B2',
  textSubtle: '#64748B',
  textOnPrimary: '#101418', // High contrast black on lime
  textOnDark: '#FFFFFF',
  primary: '#A8FF24',
  primaryDark: '#8DE615',
  primaryPressed: '#96E81D',
  primaryMuted: 'rgba(168, 255, 36, 0.18)',
  charcoal: '#101418',
  darkGray: '#252B31',
  lime: '#A8FF24',
  navy: '#101418',
  accentBlue: '#3B82F6',
  danger: '#EF4444',
  dangerPressed: '#FB7185',
  amber: '#F59E0B',
  success: '#10B981',
  muted: '#9DA6B2',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(255, 255, 255, 0.04)',
  statusAvailable: palette.available,
  statusPending: palette.pending,
  statusBooked: palette.booked,
  statusCancelled: palette.cancelled,
  statusApproved: palette.approved,
  statusRejected: palette.rejected,
};
