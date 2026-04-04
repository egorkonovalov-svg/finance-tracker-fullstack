import { ApiError } from '@/services/api-client';

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error';
}

export function extractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const body = e.body as Record<string, unknown> | null;
    return (body?.detail as string) ?? (body?.message as string) ?? fallback;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}
