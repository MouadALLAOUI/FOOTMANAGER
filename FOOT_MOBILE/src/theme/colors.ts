export const palette = {
  primaryGreen: '#16A34A',
  darkGreen: '#065F46',
  navy: '#0F2747',
  accentBlue: '#3B82F6',
  background: '#F8FAFC',
  surface: '#FFFFFF',

  // Status colors
  available: '#22C55E',
  pending: '#F59E0B',
  booked: '#EF4444',
  cancelled: '#6B7280',
  approved: '#10B981',
  rejected: '#DC2626',

  // Extended palette & aliases
  green: '#16A34A',
  greenDark: '#065F46',
  greenLight: '#DCFCE7',
  dark: '#0F2747',
  darkCard: '#1E293B',
  darkBorder: '#334155',
  darkMuted: '#64748B',
  light: '#F8FAFC',
  lightCard: '#FFFFFF',
  lightBorder: '#E2E8F0',
  lightMuted: '#94A3B8',
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
  overlay: 'rgba(15, 39, 71, 0.6)',
  overlayLight: 'rgba(15, 39, 71, 0.05)',
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
  player: palette.primaryGreen,
  manager: palette.darkGreen,
  terrain_owner: palette.primaryGreen,
  committee: palette.accentBlue,
  admin: palette.navy,
} as const;

export type RoleAccentKey = keyof typeof roleAccents;

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
  primaryDark: string;
  primaryPressed: string;
  navy: string;
  accentBlue: string;
  danger: string;
  dangerPressed: string;
  amber: string;
  success: string;
  muted: string;
  overlay: string;
  // Status tokens
  statusAvailable: string;
  statusPending: string;
  statusBooked: string;
  statusCancelled: string;
  statusApproved: string;
  statusRejected: string;
}

export const lightColors: ThemeColors = {
  bg: palette.background,
  bgMuted: '#F1F5F9',
  surface: palette.surface,
  surfaceHover: '#F8FAFC',
  border: palette.lightBorder,
  borderStrong: '#CBD5E1',
  text: palette.navy,
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  primary: palette.primaryGreen,
  primaryDark: palette.darkGreen,
  primaryPressed: palette.darkGreen,
  navy: palette.navy,
  accentBlue: palette.accentBlue,
  danger: palette.danger,
  dangerPressed: palette.dangerDark,
  amber: palette.amber,
  success: palette.approved,
  muted: palette.muted,
  overlay: palette.overlay,
  statusAvailable: palette.available,
  statusPending: palette.pending,
  statusBooked: palette.booked,
  statusCancelled: palette.cancelled,
  statusApproved: palette.approved,
  statusRejected: palette.rejected,
};

export const darkColors: ThemeColors = {
  bg: '#0B192C',
  bgMuted: '#1E293B',
  surface: '#15253B',
  surfaceHover: '#1E3352',
  border: '#243B55',
  borderStrong: '#3A506B',
  text: palette.light,
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  textOnPrimary: '#FFFFFF',
  primary: palette.primaryGreen,
  primaryDark: palette.darkGreen,
  primaryPressed: palette.darkGreen,
  navy: '#0B192C',
  accentBlue: palette.accentBlue,
  danger: palette.danger,
  dangerPressed: '#FB7185',
  amber: palette.amber,
  success: palette.approved,
  muted: '#94A3B8',
  overlay: palette.overlay,
  statusAvailable: palette.available,
  statusPending: palette.pending,
  statusBooked: palette.booked,
  statusCancelled: palette.cancelled,
  statusApproved: palette.approved,
  statusRejected: palette.rejected,
};
