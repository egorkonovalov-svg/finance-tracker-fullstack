import { mockDelay } from '../utils/mock';

describe('mockDelay', () => {
  it('resolves after approximately the given ms', async () => {
    const start = Date.now();
    await mockDelay(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('uses 300ms default when no argument given', async () => {
    jest.useFakeTimers();
    const promise = mockDelay();
    jest.advanceTimersByTime(300);
    await promise;
    jest.useRealTimers();
  });
});
