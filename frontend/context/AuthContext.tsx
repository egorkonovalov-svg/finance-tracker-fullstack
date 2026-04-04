import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthToken } from '@/services/api-client';
import { authService } from '@/services/auth';
import type {
  User,
  LoginPayload,
  SignupPayload,
  SocialAuthPayload,
  SessionResponse,
  VerifyCodePayload,
  ResendCodePayload,
} from '@/types/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingVerification {
  session_id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  pendingVerification: PendingVerification | null;
  setPendingVerification: (v: PendingVerification | null) => void;
  login: (payload: LoginPayload) => Promise<SessionResponse>;
  signup: (payload: SignupPayload) => Promise<SessionResponse>;
  verifyCode: (payload: VerifyCodePayload) => Promise<void>;
  resendCode: (payload: ResendCodePayload) => Promise<SessionResponse>;
  socialAuth: (payload: SocialAuthPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'fintrack_token';

// expo-secure-store has no web support; fall back to localStorage on web
const storage = {
  getItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(localStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const persistToken = useCallback(async (t: string | null) => {
    setToken(t);
    setAuthToken(t);
    if (t) {
      await storage.setItem(TOKEN_KEY, t);
    } else {
      await storage.deleteItem(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getItem(TOKEN_KEY);
        if (stored) {
          const exp = getTokenExp(stored);
          if (exp !== null && exp * 1000 < Date.now()) {
            await storage.deleteItem(TOKEN_KEY);
          } else {
            setAuthToken(stored);
            const me = await authService.me();
            setToken(stored);
            setUser(me);
            setAuthError(null);
          }
        }
      } catch (e) {
        console.error('Session restore error:', e);
        await storage.deleteItem(TOKEN_KEY);
        setAuthToken(null);
        setAuthError('Session expired. Please sign in again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<SessionResponse> => {
    return authService.login(payload);
  }, []);

  const signup = useCallback(async (payload: SignupPayload): Promise<SessionResponse> => {
    return authService.signup(payload);
  }, []);

  const verifyCode = useCallback(async (payload: VerifyCodePayload) => {
    const res = await authService.verifyCode(payload);
    await persistToken(res.access_token);
    setUser(res.user);
    setPendingVerification(null);
  }, [persistToken]);

  const resendCode = useCallback(async (payload: ResendCodePayload): Promise<SessionResponse> => {
    return authService.resendCode(payload);
  }, []);

  const socialAuth = useCallback(async (payload: SocialAuthPayload) => {
    const res = await authService.socialAuth(payload);
    await persistToken(res.access_token);
    setUser(res.user);
  }, [persistToken]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    await persistToken(null);
  }, [persistToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        authError,
        clearAuthError,
        pendingVerification,
        setPendingVerification,
        login,
        signup,
        verifyCode,
        resendCode,
        socialAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the authentication context.
 *
 * Must be called inside an {@link AuthProvider}.
 *
 * @returns Authentication state (`user`, `token`, `isAuthenticated`, `loading`,
 *   `authError`, `pendingVerification`) and methods (`login`, `signup`,
 *   `verifyCode`, `resendCode`, `socialAuth`, `logout`, `clearAuthError`,
 *   `setPendingVerification`).
 * @throws {Error} If called outside an `AuthProvider`.
 *
 * @example
 * ```tsx
 * const { isAuthenticated, logout } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
