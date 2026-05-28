import { Platform, TextStyle } from 'react-native';

// ── Palette ────────────────────────────────────────────────────────────────────

const tintColorLight = '#6366F1';
const tintColorDark = '#818CF8';

export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6B7280',
    background: '#F9FAFB',
    card: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    border: '#E5E7EB',
    separator: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#0C0C1A',
    card: '#1A1A2E',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#4B5563',
    tabIconSelected: tintColorDark,
    border: '#2D2D44',
    separator: '#1E1E30',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export const Brand = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryGradient: ['#6366F1', '#8B5CF6'] as const,
  swiggy: '#FC8019',
  zomato: '#E23744',
  uberEats: '#06C167',
  gold: '#F59E0B',
  success: '#10B981',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  border: '#E5E7EB',
  textMuted: '#6B7280',
};

// ── Spacing Scale (4-pt grid) ──────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ── Border Radii ───────────────────────────────────────────────────────────────

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#1A1209',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1209',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1209',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────

export const Typography: Record<string, TextStyle> = {
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, lineHeight: 41 },
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '600', lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  callout: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  subheadline: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption1: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  caption2: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, lineHeight: 13 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1, lineHeight: 13, textTransform: 'uppercase' },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
