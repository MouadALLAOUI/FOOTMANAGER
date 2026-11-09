export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  small: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },

  // AJI NQSSRO High-Contrast Arabic Typography Presets
  arabicHero: { fontSize: 28, fontWeight: '900' as const, lineHeight: 36 },
  arabicSectionTitle: { fontSize: 20, fontWeight: '900' as const, lineHeight: 28 },
  arabicCardTitle: { fontSize: 18, fontWeight: '900' as const, lineHeight: 24 },
  arabicBodyBold: { fontSize: 15, fontWeight: '800' as const, lineHeight: 22 },
  arabicLabelBold: { fontSize: 14, fontWeight: '800' as const, lineHeight: 20 },
  arabicPillBold: { fontSize: 13, fontWeight: '800' as const, lineHeight: 18 },
} as const;

export type TextVariant = keyof typeof typography;
