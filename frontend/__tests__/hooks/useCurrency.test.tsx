import { renderHook } from '@testing-library/react-native';
import { useCurrency } from '@/hooks/useCurrency';
import { useApp } from '@/context/AppContext';

jest.mock('@/context/AppContext', () => ({ useApp: jest.fn() }));
const mockUseApp = jest.mocked(useApp);

describe('useCurrency', () => {
  it('returns currency, symbol=₽, rate=1 for RUB', () => {
    mockUseApp.mockReturnValue({ currency: 'RUB', locale: 'ru', exchangeRates: { RUB: 1 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe('RUB');
    expect(result.current.symbol).toBe('₽');
    expect(result.current.rate).toBe(1);
    expect(result.current.ratesLoading).toBe(false);
  });

  it('returns symbol=$ for USD', () => {
    mockUseApp.mockReturnValue({ currency: 'USD', locale: 'en', exchangeRates: { USD: 0.0108 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.symbol).toBe('$');
  });

  it('returns symbol=€ for EUR', () => {
    mockUseApp.mockReturnValue({ currency: 'EUR', locale: 'en', exchangeRates: { EUR: 0.0099 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.symbol).toBe('€');
  });

  it('returns symbol=£ for GBP', () => {
    mockUseApp.mockReturnValue({ currency: 'GBP', locale: 'en', exchangeRates: { GBP: 0.0085 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.symbol).toBe('£');
  });

  it('rate is always 1 for RUB regardless of exchangeRates', () => {
    mockUseApp.mockReturnValue({ currency: 'RUB', locale: 'ru', exchangeRates: { USD: 0.01, EUR: 0.009 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.rate).toBe(1);
  });

  it('rate comes from exchangeRates for non-RUB currency', () => {
    mockUseApp.mockReturnValue({ currency: 'USD', locale: 'en', exchangeRates: { USD: 0.0108 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.rate).toBeCloseTo(0.0108);
  });

  it('rate defaults to 1 when currency not in exchangeRates', () => {
    mockUseApp.mockReturnValue({ currency: 'GBP', locale: 'en', exchangeRates: {}, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.rate).toBe(1);
  });

  it('convert multiplies amountRUB by rate', () => {
    mockUseApp.mockReturnValue({ currency: 'USD', locale: 'en', exchangeRates: { USD: 0.01 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.convert(10000)).toBeCloseTo(100);
  });

  it('convert returns same amount for RUB (rate=1)', () => {
    mockUseApp.mockReturnValue({ currency: 'RUB', locale: 'ru', exchangeRates: { RUB: 1 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.convert(5000)).toBe(5000);
  });

  it('convertAndFormat returns a string containing the converted amount', () => {
    mockUseApp.mockReturnValue({ currency: 'USD', locale: 'en', exchangeRates: { USD: 0.01 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    // 10000 RUB * 0.01 = 100 USD
    const formatted = result.current.convertAndFormat(10000);
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('100');
  });

  it('convertAndFormat for RUB includes the amount', () => {
    mockUseApp.mockReturnValue({ currency: 'RUB', locale: 'ru', exchangeRates: { RUB: 1 }, ratesLoading: false });
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.convertAndFormat(1000);
    expect(formatted).toMatch(/1[\s,.\u00A0]?000/);
  });

  it('ratesLoading=true is passed through', () => {
    mockUseApp.mockReturnValue({ currency: 'RUB', locale: 'ru', exchangeRates: {}, ratesLoading: true });
    const { result } = renderHook(() => useCurrency());
    expect(result.current.ratesLoading).toBe(true);
  });
});
