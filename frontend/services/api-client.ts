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

/**
 * Set (or clear) the JWT used in the `Authorization: Bearer` header for every
 * subsequent {@link request} call.
 *
 * Call with a non-null token after login and with `null` after logout.
 *
 * @param token - JWT access token, or `null` to remove the auth header.
 */
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

/**
 * Thrown by {@link request} when the server returns a non-2xx HTTP status.
 *
 * @example
 * ```ts
 * try {
 *   await api.get('/me');
 * } catch (e) {
 *   if (e instanceof ApiError && e.status === 401) { // handle unauthorised }
 * }
 * ```
 */
class ApiError extends Error {
  /** HTTP status code returned by the server. */
  status: number;
  /** Parsed JSON response body, or `null` if the body was not valid JSON. */
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Construct the full request URL from `BASE_URL`, `path`, and optional query
 * parameters. Keys with `undefined` values are omitted from the query string.
 *
 * @param path - Endpoint path, e.g. `'/transactions'`.
 * @param params - Optional key/value pairs appended as query string.
 * @returns Fully qualified URL string.
 */
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

/**
 * Core HTTP client used by all `api.*` methods.
 *
 * Automatically:
 * - Builds the full URL with query params via {@link buildUrl}.
 * - Injects `Authorization: Bearer <token>` when a token is set via {@link setAuthToken}.
 * - Applies a 15-second timeout unless overridden by `opts.timeoutMs`.
 * - Returns `undefined` (cast as `T`) for 204 No Content responses.
 *
 * @param method - HTTP method (`'GET'`, `'POST'`, `'PUT'`, `'DELETE'`).
 * @param path - API endpoint path, e.g. `'/transactions'`.
 * @param body - Optional request body; serialized to JSON automatically.
 * @param opts - Optional per-request configuration (headers, params, signal, timeout).
 * @returns Parsed JSON response body typed as `T`.
 * @throws {ApiError} When the server returns a non-2xx status. The error carries
 *   `status` (HTTP code) and `body` (parsed JSON response or `null`).
 * @throws {DOMException} `AbortError` when the request times out or is cancelled
 *   via `opts.signal`.
 */
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
