import type { ExchangeRatesResponse } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = '@fintrack_rates';
const CACHE_TS_KEY = '@fintrack_rates_ts';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hardcoded fallback rates (approximate) used when both the API and
 * AsyncStorage cache are unavailable. Keeps the app functional offline.
 */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  RUB: 92.5,
  JPY: 155.0,
};

// ─── In-memory cache ─────────────────────────────────────────────────────────

let memoryRates: Record<string, number> | null = null;
let memoryTimestamp: number = 0;

function isCacheFresh(ts: number): boolean {
  return Date.now() - ts < CACHE_TTL_MS;
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

async function readCachedRates(): Promise<{ rates: Record<string, number>; ts: number } | null> {
  try {
    const [ratesJson, tsStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEY),
      AsyncStorage.getItem(CACHE_TS_KEY),
    ]);
    if (ratesJson && tsStr) {
      return { rates: JSON.parse(ratesJson), ts: Number(tsStr) };
    }
  } catch {
    // Silently ignore read failures
  }
  return null;
}

async function writeCachedRates(rates: Record<string, number>): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rates)),
      AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now())),
    ]);
  } catch {
    // Silently ignore write failures
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches current exchange rates with USD as the base currency.
 *
 * Resolution order:
 * 1. In-memory cache (if < 1 hour old)
 * 2. Live API call -> updates both caches
 * 3. AsyncStorage cache (any age, stale is better than nothing)
 * 4. Hardcoded fallback rates
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // 1. Check in-memory cache
  if (memoryRates && isCacheFresh(memoryTimestamp)) {
    return memoryRates;
  }

  // 2. Try live API
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: ExchangeRatesResponse = await res.json();

    if (data.result === 'success' && data.rates) {
      // Update both caches
      memoryRates = data.rates;
      memoryTimestamp = Date.now();
      writeCachedRates(data.rates); // fire-and-forget
      return data.rates;
    }
  } catch {
    // API failed, fall through to cached/fallback
  }

  // 3. Try AsyncStorage cache (even stale)
  const cached = await readCachedRates();
  if (cached) {
    memoryRates = cached.rates;
    memoryTimestamp = cached.ts;
    return cached.rates;
  }

  // 4. Hardcoded fallback
  memoryRates = FALLBACK_RATES;
  memoryTimestamp = Date.now();
  return FALLBACK_RATES;
}
