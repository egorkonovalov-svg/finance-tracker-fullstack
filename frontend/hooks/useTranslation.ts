import { useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import type { SupportedLocale } from '@/types';

const translations: Record<SupportedLocale, Record<string, string>> = {
  en: require('@/locales/en.json'),
  ru: require('@/locales/ru.json'),
};

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
}

/**
 * Translation hook. Reads locale from AppContext and returns `t(key)` that looks
 * up the string from `locales/[locale].json`, with optional `{{param}}`
 * interpolation. Falls back to the English dictionary, then the raw key.
 *
 * @returns `{ t, locale, setLocale }` — translation function, current locale,
 *   and locale setter.
 *
 * @example
 * ```tsx
 * const { t } = useTranslation();
 * t('errors.generic');                              // "Something went wrong"
 * t('errors.passwordMinLength', { count: 8 });     // "Password must be at least 8 characters"
 * ```
 */
export function useTranslation() {
  const { locale, setLocale } = useApp();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale] ?? translations.en;
      const raw = dict[key] ?? translations.en[key] ?? key;
      return interpolate(raw, params);
    },
    [locale],
  );

  return { t, locale, setLocale };
}

/**
 * Map SupportedLocale to Intl/BCP 47 locale for date/number formatting.
 */
export function localeToBCP47(locale: SupportedLocale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}
