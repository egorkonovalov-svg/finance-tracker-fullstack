import { ApiError } from '@/services/api-client';

describe('ApiError', () => {
  it('has status and body', () => {
    const body = { detail: 'Invalid code' };
    const err = new ApiError(400, body);
    expect(err.status).toBe(400);
    expect(err.body).toEqual(body);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.message).toContain('400');
  });

  it('accepts null body', () => {
    const err = new ApiError(500, null);
    expect(err.status).toBe(500);
    expect(err.body).toBeNull();
  });
});
