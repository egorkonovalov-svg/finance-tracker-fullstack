import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
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
      await SecureStore.setItemAsync(TOKEN_KEY, t);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const exp = getTokenExp(stored);
          if (exp !== null && exp * 1000 < Date.now()) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
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
        await SecureStore.deleteItemAsync(TOKEN_KEY);
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
