import { api, USE_MOCK } from './api-client';
import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  SocialAuthPayload,
  SessionResponse,
  VerifyCodePayload,
  ResendCodePayload,
  User,
} from '@/types/auth';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const MOCK_USER: User = {
  id: 'user-1',
  email: 'demo@fintrack.app',
  name: 'Demo User',
};

const ADMIN_USER: User = {
  id: 'user-0',
  email: 'admin',
  name: 'Admin',
};

const MOCK_TOKEN = 'mock-jwt-token-fintrack';

function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

const MOCK_SESSION_ID = 'mock-session-id-12345';

async function mockLogin(payload: LoginPayload): Promise<SessionResponse> {
  await delay();
  if (!payload.email || !payload.password) {
    throw new Error('Email and password are required');
  }
  if (payload.email !== 'admin' && payload.password.length < 6) {
    throw new Error('Invalid credentials');
  }
  return { session_id: MOCK_SESSION_ID, message: 'Verification code sent to your email' };
}

async function mockSignup(payload: SignupPayload): Promise<SessionResponse> {
  await delay(500);
  if (!payload.email || !payload.password) {
    throw new Error('Email and password are required');
  }
  if (payload.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return { session_id: MOCK_SESSION_ID, message: 'Verification code sent to your email' };
}

async function mockVerifyCode(_payload: VerifyCodePayload): Promise<AuthResponse> {
  await delay(300);
  return { user: MOCK_USER, access_token: MOCK_TOKEN };
}

async function mockResendCode(_payload: ResendCodePayload): Promise<SessionResponse> {
  await delay(300);
  return { session_id: 'mock-new-session-id', message: 'New verification code sent to your email' };
}

async function mockSocialAuth(_payload: SocialAuthPayload): Promise<AuthResponse> {
  await delay(300);
  return { user: MOCK_USER, access_token: MOCK_TOKEN };
}

async function mockMe(): Promise<User> {
  await delay(200);
  return MOCK_USER;
}

async function mockLogout(): Promise<void> {
  await delay(100);
}

// ─── Response normalisation ──────────────────────────────────────────────────

function normalizeAuthResponse(raw: Record<string, unknown>): AuthResponse {
  const token = (raw.access_token ?? raw.token) as string | undefined;

  const rawUser = (raw.user ??
    (raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>).user : undefined)) as
    | User
    | undefined;

  if (!token) {
    throw new Error('Server response missing access token');
  }
  if (!rawUser?.id || !rawUser?.email) {
    throw new Error('Server response missing user data');
  }

  return { access_token: token, user: rawUser };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const authService = {
  async login(payload: LoginPayload): Promise<SessionResponse> {
    if (USE_MOCK) return mockLogin(payload);
    return api.post<SessionResponse>('/auth/login', payload);
  },

  async signup(payload: SignupPayload): Promise<SessionResponse> {
    if (USE_MOCK) return mockSignup(payload);
    return api.post<SessionResponse>('/auth/signup', payload);
  },

  async verifyCode(payload: VerifyCodePayload): Promise<AuthResponse> {
    if (USE_MOCK) return mockVerifyCode(payload);
    const raw = await api.post<Record<string, unknown>>('/auth/verify-code', payload);
    return normalizeAuthResponse(raw);
  },

  async resendCode(payload: ResendCodePayload): Promise<SessionResponse> {
    if (USE_MOCK) return mockResendCode(payload);
    return api.post<SessionResponse>('/auth/resend-code', payload);
  },

  async socialAuth(payload: SocialAuthPayload): Promise<AuthResponse> {
    if (USE_MOCK) return mockSocialAuth(payload);
    const raw = await api.post<Record<string, unknown>>('/auth/social', payload);
    return normalizeAuthResponse(raw);
  },

  me(): Promise<User> {
    if (USE_MOCK) return mockMe();
    return api.get('/auth/me');
  },

  logout(): Promise<void> {
    if (USE_MOCK) return mockLogout();
    return api.post('/auth/logout', {});
  },
};
