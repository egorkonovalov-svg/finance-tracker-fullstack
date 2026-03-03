import { useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/constants/theme';
import { localeToBCP47 } from '@/hooks/useTranslation';

/**
 * Convenience hook for currency conversion and formatting.
 *
 * All stored amounts are in USD. This hook reads the selected currency,
 * locale, and live exchange rates from AppContext, then provides helpers to
 * convert and format on the fly.
 */
export function useCurrency() {
  const { currency, locale, exchangeRates, ratesLoading } = useApp();
  const bcp47 = localeToBCP47(locale);

  const rate = useMemo(
    () => (currency === 'USD' ? 1 : exchangeRates[currency] ?? 1),
    [currency, exchangeRates],
  );

  const symbol = useMemo(
    () => CURRENCY_SYMBOLS[currency] ?? currency,
    [currency],
  );

  /** Convert a USD amount to the selected currency (number only). */
  const convert = useCallback(
    (amountUSD: number): number => amountUSD * rate,
    [rate],
  );

  /**
   * Convert a USD amount and return a fully formatted string
   * with the correct symbol, decimal places, and grouping.
   */
  const convertAndFormat = useCallback(
    (amountUSD: number): string => formatCurrency(amountUSD, currency, rate, bcp47),
    [currency, rate, bcp47],
  );

  return {
    /** Current currency code, e.g. "EUR" */
    currency,
    /** Currency symbol, e.g. "€" */
    symbol,
    /** Exchange rate from USD to selected currency */
    rate,
    /** Whether rates are still loading from the API */
    ratesLoading,
    /** Convert USD amount to target currency (number) */
    convert,
    /** Convert + format USD amount to a display string */
    convertAndFormat,
  };
}
