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
  // Fountain-pen inspired inks
  charcoal:  '#1A1A1B',  // primary text ink
  incomeInk: '#2E7D32',  // deep emerald ink
  expenseInk: '#B22222', // dried oxblood red
} as const;

// ─── Theme Colors ────────────────────────────────────────────────────────────

export const Colors = {
  light: {
    // Surfaces
    background:       '#F5F2E9',       // warm ivory paper
    surface:          'rgba(245,242,233,0.9)',
    surfaceBorder:    'rgba(245,242,233,0.65)',
    card:             'rgba(245,242,233,0.85)',

    // Text
    text:             Palette.charcoal,
    textSecondary:    Palette.gray500,
    textMuted:        Palette.gray400,

    // Brand
    tint:             Palette.indigo,
    primary:          Palette.indigo,
    primaryLight:     Palette.indigoLight,

    // Semantic
    income:           Palette.incomeInk,
    incomeLight:      'rgba(46,125,50,0.2)',
    expense:          Palette.expenseInk,
    expenseLight:     'rgba(178,34,34,0.22)',

    // Tab bar
    tabIconDefault:   Palette.gray400,
    tabIconSelected:  Palette.indigo,
    tabBar:           'rgba(245,242,233,0.9)',
    tabBarBorder:     'rgba(245,242,233,0.45)',

    // UI
    icon:             Palette.gray500,
    separator:        Palette.gray200,
    inputBg:          'rgba(245,242,233,0.9)',
    inputBorder:      Palette.gray200,
    placeholder:      Palette.gray400,
    overlay:          'rgba(26,26,27,0.35)',
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
    income:           Palette.incomeInk,
    incomeLight:      'rgba(46,125,50,0.3)',
    expense:          Palette.expenseInk,
    expenseLight:     'rgba(178,34,34,0.32)',

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
    overlay:          'rgba(26,26,27,0.7)',
  },
} as const;

export type ThemeColors = typeof Colors.light | typeof Colors.dark;

// ─── Glass Tokens ────────────────────────────────────────────────────────────

export const Glass = {
  light: {
    blur: 24,
    tint: 'light' as const,
    backgroundColor: 'rgba(245,242,233,0.38)',
    borderColor: 'rgba(245,242,233,0.6)',
    borderWidth: 0.5,
    shadowColor: 'rgba(26,26,27,0.06)',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  dark: {
    blur: 28,
    tint: 'dark' as const,
    backgroundColor: 'rgba(30,27,60,0.5)',
    borderColor: 'rgba(245,242,233,0.25)',
    borderWidth: 0.5,
    shadowColor: 'rgba(15,23,42,0.4)',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
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
  sm: 2,
  md: 3,
  lg: 4,
  xl: 4,
  '2xl': 4,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FontFamily = {
  heading: 'PlayfairDisplay_700Bold',
  headingMedium: 'PlayfairDisplay_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
  mono: 'SpaceMono_400Regular',
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
 * Format and optionally convert a USD amount into the target currency.
 *
 * @param amountUSD - The amount in USD (base currency)
 * @param currency  - Target currency code (e.g. "EUR")
 * @param rate      - Exchange rate from USD -> target. Defaults to 1 (no conversion).
 * @param locale    - BCP 47 locale for number formatting (e.g. "en-US", "ru-RU"). Optional.
 */
export function formatCurrency(amountUSD: number, currency: string = 'USD', rate: number = 1, locale?: string): string {
  const converted = amountUSD * rate;
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
