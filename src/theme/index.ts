/**
 * Bin Bin design tokens. Minimalist black/white/gray, with green as the
 * one accent color (buttons, progress, active states). Rounded corners,
 * light/no borders: surfaces separate by subtle background contrast, not
 * heavy outlines.
 *
 * Import from here instead of hardcoding hex values, font sizes, radii, or
 * spacing in a component's StyleSheet.create.
 */

export const palette = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray200: '#E5E5E5',
  gray400: '#9E9E9E',
  gray600: '#616161',
  green: '#4E7A5A',
  red: '#DC2626',
} as const;

export const colors = {
  background: palette.gray50,
  surface: palette.white,
  dark: palette.black,

  border: palette.gray200,
  divider: palette.gray200,

  textPrimary: palette.black,
  textSecondary: palette.gray600,
  textMuted: palette.gray400,
  textOnDark: palette.white,

  primary: palette.green,
  accent: palette.green,
  danger: palette.red,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// Thin, optional: most separation comes from surface-vs-background
// contrast, not a border. Use where a card sits on a same-color area.
export const border = {
  width: 1,
  color: palette.gray200,
} as const;

export const typography = {
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  title: { fontSize: 28, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
  small: { fontSize: 11, fontWeight: '400' },
} as const;
