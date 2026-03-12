import { Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────────────────────

export const Palette = {
  indigo:    '#4F46E5',
  indigoLight: '#818CF8',
  indigoDark: '#3730A3',
  emerald:   '#10B981',
  emeraldLight: '#34D399',
  red:       '#EF4444',
  redLight:  '#F87171',
  amber:     '#F59E0B',
  sky:       '#0EA5E9',
  violet:    '#8B5CF6',
  pink:      '#EC4899',
  orange:    '#F97316',
  teal:      '#14B8A6',
  gray50:    '#F9FAFB',
  gray100:   '#F3F4F6',
  gray200:   '#E5E7EB',
  gray300:   '#D1D5DB',
  gray400:   '#9CA3AF',
  gray500:   '#6B7280',
  gray600:   '#4B5563',
  gray700:   '#374151',
  gray800:   '#1F2937',
  gray900:   '#111827',
  gray950:   '#030712',
  white:     '#FFFFFF',
  black:     '#000000',
} as const;

// ─── Theme Colors ────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    // Surfaces
    background:       '#F5F3FF',       // very faint indigo wash
    surface:          'rgba(255,255,255,0.72)',
    surfaceBorder:    'rgba(255,255,255,0.45)',
    card:             'rgba(255,255,255,0.55)',

    // Text
    text:             Palette.gray900,
    textSecondary:    Palette.gray500,
    textMuted:        Palette.gray400,

    // Brand
    tint:             Palette.indigo,
    primary:          Palette.indigo,
    primaryLight:     Palette.indigoLight,

    // Semantic
    income:           Palette.emerald,
    incomeLight:      Palette.emeraldLight,
    expense:          Palette.red,
    expenseLight:     Palette.redLight,

    // Tab bar
    tabIconDefault:   Palette.gray400,
    tabIconSelected:  Palette.indigo,
    tabBar:           'rgba(255,255,255,0.85)',
    tabBarBorder:     'rgba(255,255,255,0.3)',

    // UI
    icon:             Palette.gray500,
    separator:        Palette.gray200,
    inputBg:          'rgba(255,255,255,0.6)',
    inputBorder:      Palette.gray200,
    placeholder:      Palette.gray400,
    overlay:          'rgba(0,0,0,0.3)',
  },
  dark: {
    // Surfaces
    background:       '#0C0A1D',       // deep navy
    surface:          'rgba(30,27,60,0.72)',
    surfaceBorder:    'rgba(255,255,255,0.08)',
    card:             'rgba(30,27,60,0.55)',

    // Text
    text:             Palette.gray50,
    textSecondary:    Palette.gray400,
    textMuted:        Palette.gray600,

    // Brand
    tint:             Palette.indigoLight,
    primary:          Palette.indigoLight,
    primaryLight:     Palette.indigo,

    // Semantic
    income:           Palette.emerald,
    incomeLight:      Palette.emeraldLight,
    expense:          Palette.red,
    expenseLight:     Palette.redLight,

    // Tab bar
    tabIconDefault:   Palette.gray600,
    tabIconSelected:  Palette.indigoLight,
    tabBar:           'rgba(12,10,29,0.92)',
    tabBarBorder:     'rgba(255,255,255,0.06)',

    // UI
    icon:             Palette.gray400,
    separator:        'rgba(255,255,255,0.08)',
    inputBg:          'rgba(255,255,255,0.06)',
    inputBorder:      'rgba(255,255,255,0.1)',
    placeholder:      Palette.gray600,
    overlay:          'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColors = typeof Colors.light | typeof Colors.dark;

// ─── Glass Tokens ────────────────────────────────────────────────────────────

export const Glass = {
  light: {
    blur: 40,
    tint: 'light' as const,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  dark: {
    blur: 50,
    tint: 'dark' as const,
    backgroundColor: 'rgba(30,27,60,0.4)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FontFamily = {
  heading: 'Manrope_700Bold',
  headingMedium: 'Manrope_600SemiBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  mono: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// ─── Currency Formatting ─────────────────────────────────────────────────────

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
  GBP: '£',
  JPY: '¥',
};

/** Currencies that conventionally have no decimal places */
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'ISK', 'HUF']);

/**
 * Format and optionally convert a RUB amount into the target currency.
 *
 * @param amountRUB - The amount in RUB (base currency)
 * @param currency  - Target currency code (e.g. "EUR")
 * @param rate      - Exchange rate from RUB -> target. Defaults to 1 (no conversion).
 * @param locale    - BCP 47 locale for number formatting (e.g. "en-US", "ru-RU"). Optional.
 */
export function formatCurrency(amountRUB: number, currency: string = 'RUB', rate: number = 1, locale?: string): string {
  const converted = amountRUB * rate;
  const formatLocale = locale ?? undefined;

  try {
    // Use Intl.NumberFormat for locale-aware formatting with correct decimals
    const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
    const formatter = new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatter.format(converted);
  } catch {
    // Fallback if Intl doesn't know the currency code
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    const abs = Math.abs(converted);
    const decimals = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
    const formatted = abs.toLocaleString(formatLocale ?? 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return converted < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }
}

// Legacy Fonts export for compatibility
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
