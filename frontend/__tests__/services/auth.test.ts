describe('authService — mock path (USE_MOCK=true)', () => {
  let authService: typeof import('@/services/auth')['authService'];

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.isolateModules(() => {
      jest.mock('@/services/api-client', () => ({
        api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() },
        USE_MOCK: true,
        ApiError: class ApiError extends Error {
          status: number; body: unknown;
          constructor(s: number, b: unknown) { super(`API error ${s}`); this.status = s; this.body = b; }
        },
      }));
      authService = require('@/services/auth').authService;
    });
  });

  it('login with valid credentials returns session_id', async () => {
    const p = authService.login({ email: 'user@example.com', password: 'password123' });
    await jest.runAllTimersAsync();
    const result = await p;
    expect(result.session_id).toBe('mock-session-id-12345');
    expect(result.message).toBe('Verification code sent to your email');
  });

  it('login throws when email is empty', async () => {
    const p = authService.login({ email: '', password: 'password123' });
    const assertion = expect(p).rejects.toThrow('Email and password are required');
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('login throws when password is shorter than 8 chars', async () => {
    const p = authService.login({ email: 'user@example.com', password: 'short' });
    const assertion = expect(p).rejects.toThrow('Invalid credentials');
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('signup with valid payload returns session_id', async () => {
    const p = authService.signup({ email: 'new@example.com', password: 'validpass', name: 'New User' });
    await jest.runAllTimersAsync();
    const result = await p;
    expect(result.session_id).toBe('mock-session-id-12345');
  });

  it('signup throws when password shorter than 8 chars', async () => {
    const p = authService.signup({ email: 'new@example.com', password: 'short' });
    const assertion = expect(p).rejects.toThrow('Password must be at least 8 characters');
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('verifyCode returns user and access_token', async () => {
    const p = authService.verifyCode({ session_id: 'any-session', code: '123456' });
    await jest.runAllTimersAsync();
    const result = await p;
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('demo@fintrack.app');
    expect(result.access_token).toBe('mock-jwt-token-fintrack');
  });

  it('resendCode returns a new session_id', async () => {
    const p = authService.resendCode({ session_id: 'old-session' });
    await jest.runAllTimersAsync();
    const result = await p;
    expect(result.session_id).toBe('mock-new-session-id');
  });

  it('me returns mock user', async () => {
    const p = authService.me();
    await jest.runAllTimersAsync();
    const user = await p;
    expect(user.id).toBe('user-1');
    expect(user.name).toBe('Demo User');
  });

  it('logout resolves without error', async () => {
    const p = authService.logout();
    await jest.runAllTimersAsync();
    await expect(p).resolves.toBeUndefined();
  });
});

describe('authService — real path (USE_MOCK=false)', () => {
  let authService: typeof import('@/services/auth')['authService'];
  let mockApi: { get: jest.Mock; post: jest.Mock; put: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() };
    jest.isolateModules(() => {
      jest.mock('@/services/api-client', () => ({
        api: mockApi,
        USE_MOCK: false,
        ApiError: class ApiError extends Error {
          status: number; body: unknown;
          constructor(s: number, b: unknown) { super(`API error ${s}`); this.status = s; this.body = b; }
        },
      }));
      authService = require('@/services/auth').authService;
    });
  });

  it('login calls api.post /auth/login with payload', async () => {
    mockApi.post.mockResolvedValueOnce({ session_id: 'real-session', message: 'Code sent' });
    const result = await authService.login({ email: 'a@b.com', password: 'pass1234' });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass1234' });
    expect(result.session_id).toBe('real-session');
  });

  it('signup calls api.post /auth/signup', async () => {
    mockApi.post.mockResolvedValueOnce({ session_id: 'sess', message: 'ok' });
    await authService.signup({ email: 'a@b.com', password: 'pass1234' });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/signup', expect.objectContaining({ email: 'a@b.com' }));
  });

  it('verifyCode normalises response with access_token field', async () => {
    mockApi.post.mockResolvedValueOnce({ access_token: 'jwt-abc', user: { id: 'u1', email: 'a@b.com' } });
    const result = await authService.verifyCode({ session_id: 'sess', code: '0000' });
    expect(result.access_token).toBe('jwt-abc');
    expect(result.user.id).toBe('u1');
  });

  it('verifyCode normalises legacy token field', async () => {
    mockApi.post.mockResolvedValueOnce({ token: 'jwt-legacy', user: { id: 'u2', email: 'b@c.com' } });
    const result = await authService.verifyCode({ session_id: 'sess', code: '1111' });
    expect(result.access_token).toBe('jwt-legacy');
  });

  it('verifyCode throws when token is missing from response', async () => {
    mockApi.post.mockResolvedValueOnce({ user: { id: 'u1', email: 'a@b.com' } });
    await expect(authService.verifyCode({ session_id: 'sess', code: '0000' }))
      .rejects.toThrow('Server response missing access token');
  });

  it('me calls api.get /auth/me', async () => {
    mockApi.get.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });
    const result = await authService.me();
    expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    expect(result.email).toBe('a@b.com');
  });

  it('logout calls api.post /auth/logout', async () => {
    mockApi.post.mockResolvedValueOnce(undefined);
    await authService.logout();
    expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', {});
  });
});
