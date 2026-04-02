/**
 * Base HTTP client for the FastAPI backend.
 * Set EXPO_PUBLIC_USE_MOCK=true in .env to use mock data instead of the real API.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:8000/api/v1');

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// ─── Auth token ───────────────────────────────────────────────────────────────

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// ─── Types ───────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15000;

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  if (signal?.aborted) return signal;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      controller.abort();
    });
  }
  return controller.signal;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const url = buildUrl(path, opts?.params);
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const signal = opts?.signal ?? withTimeout(undefined, timeoutMs);

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : undefined),
      ...opts?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, opts?: RequestOptions) {
    return request<T>('GET', path, undefined, opts);
  },
  post<T>(path: string, body: unknown, opts?: RequestOptions) {
    return request<T>('POST', path, body, opts);
  },
  put<T>(path: string, body: unknown, opts?: RequestOptions) {
    return request<T>('PUT', path, body, opts);
  },
  del<T = void>(path: string, opts?: RequestOptions) {
    return request<T>('DELETE', path, undefined, opts);
  },
};

export { ApiError };
