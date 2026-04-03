import { useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/constants/theme';
import { localeToBCP47 } from '@/hooks/useTranslation';

/**
 * Convenience hook for currency conversion and formatting.
 *
 * All amounts are stored in RUB. This hook reads the selected currency,
 * locale, and live exchange rates from AppContext, then exposes helpers to
 * convert and format on the fly.
 *
 * @returns `{ currency, symbol, rate, ratesLoading, convert, convertAndFormat }`.
 *
 * @example
 * ```tsx
 * const { convertAndFormat } = useCurrency();
 * return <Text>{convertAndFormat(transaction.amount)}</Text>;
 * ```
 */
export function useCurrency() {
  const { currency, locale, exchangeRates, ratesLoading } = useApp();
  const bcp47 = localeToBCP47(locale);

  const rate = useMemo(
    () => (currency === 'RUB' ? 1 : exchangeRates[currency] ?? 1),
    [currency, exchangeRates],
  );

  const symbol = useMemo(
    () => CURRENCY_SYMBOLS[currency] ?? currency,
    [currency],
  );

  /** Convert a RUB amount to the selected currency (number only). */
  const convert = useCallback(
    (amountRUB: number): number => amountRUB * rate,
    [rate],
  );

  /**
   * Convert a RUB amount and return a fully formatted string
   * with the correct symbol, decimal places, and grouping.
   */
  const convertAndFormat = useCallback(
    (amountRUB: number): string => formatCurrency(amountRUB, currency, rate, bcp47),
    [currency, rate, bcp47],
  );

  return {
    /** Current currency code, e.g. "EUR" */
    currency,
    /** Currency symbol, e.g. "€" */
    symbol,
    /** Exchange rate from RUB to selected currency */
    rate,
    /** Whether rates are still loading from the API */
    ratesLoading,
    /** Convert RUB amount to target currency (number) */
    convert,
    /** Convert + format RUB amount to a display string */
    convertAndFormat,
  };
}
