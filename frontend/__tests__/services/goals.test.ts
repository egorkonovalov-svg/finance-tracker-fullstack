describe('goalsService — mock path (USE_MOCK=true)', () => {
  let goalsService: typeof import('@/services/goals')['goalsService'];

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
      goalsService = require('@/services/goals').goalsService;
    });
  });

  it('getAll returns empty array on fresh store', async () => {
    const p = goalsService.getAll();
    await jest.runAllTimersAsync();
    expect(await p).toEqual([]);
  });

  it('create adds a goal with correct fields', async () => {
    const p = goalsService.create({ name: 'New Laptop', target_amount: 150000, target_date: '2026-12-31', current_amount: 0 });
    await jest.runAllTimersAsync();
    const goal = await p;
    expect(goal.name).toBe('New Laptop');
    expect(goal.target_amount).toBe(150000);
    expect(goal.current_amount).toBe(0);
    expect(goal.created_at).toBeDefined();
  });

  it('create defaults current_amount to 0', async () => {
    const p = goalsService.create({ name: 'Vacation', target_amount: 80000, target_date: '2027-06-01' });
    await jest.runAllTimersAsync();
    const goal = await p;
    expect(goal.current_amount).toBe(0);
  });

  it('getAll returns all created goals', async () => {
    const p1 = goalsService.create({ name: 'Goal A', target_amount: 10000, target_date: '2026-06-01' });
    await jest.runAllTimersAsync();
    await p1;

    const p2 = goalsService.create({ name: 'Goal B', target_amount: 20000, target_date: '2026-07-01' });
    await jest.runAllTimersAsync();
    await p2;

    const pAll = goalsService.getAll();
    await jest.runAllTimersAsync();
    expect(await pAll).toHaveLength(2);
  });

  it('update modifies goal fields', async () => {
    const pCreate = goalsService.create({ name: 'Car', target_amount: 500000, target_date: '2027-01-01' });
    await jest.runAllTimersAsync();
    const created = await pCreate;

    const pUpdate = goalsService.update(created.id, { current_amount: 100000 });
    await jest.runAllTimersAsync();
    const updated = await pUpdate;
    expect(updated.current_amount).toBe(100000);
    expect(updated.name).toBe('Car');
  });

  it('update throws for unknown id', async () => {
    const p = goalsService.update('no-such-goal', { current_amount: 1 });
    const assertion = expect(p).rejects.toThrow('Goal no-such-goal not found');
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('remove deletes the goal', async () => {
    const pCreate = goalsService.create({ name: 'House', target_amount: 5000000, target_date: '2030-01-01' });
    await jest.runAllTimersAsync();
    const created = await pCreate;

    const pRemove = goalsService.remove(created.id);
    await jest.runAllTimersAsync();
    await pRemove;

    const pAll = goalsService.getAll();
    await jest.runAllTimersAsync();
    const all = await pAll;
    expect(all.find((g) => g.id === created.id)).toBeUndefined();
  });
});

describe('goalsService — real path (USE_MOCK=false)', () => {
  let goalsService: typeof import('@/services/goals')['goalsService'];
  let mockApi: { get: jest.Mock; post: jest.Mock; put: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() };
    jest.isolateModules(() => {
      jest.mock('@/services/api-client', () => ({ api: mockApi, USE_MOCK: false }));
      goalsService = require('@/services/goals').goalsService;
    });
  });

  it('getAll calls api.get /goals', async () => {
    mockApi.get.mockResolvedValueOnce([]);
    await goalsService.getAll();
    expect(mockApi.get).toHaveBeenCalledWith('/goals');
  });

  it('create calls api.post /goals', async () => {
    const payload = { name: 'Trip', target_amount: 50000, target_date: '2026-08-01' };
    mockApi.post.mockResolvedValueOnce({ id: 'g-1', ...payload, current_amount: 0, created_at: '' });
    await goalsService.create(payload);
    expect(mockApi.post).toHaveBeenCalledWith('/goals', payload);
  });

  it('update calls api.put /goals/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ id: 'g-1', name: 'Trip', target_amount: 50000, target_date: '2026-08-01', current_amount: 10000, created_at: '' });
    await goalsService.update('g-1', { current_amount: 10000 });
    expect(mockApi.put).toHaveBeenCalledWith('/goals/g-1', { current_amount: 10000 });
  });

  it('remove calls api.del /goals/:id', async () => {
    mockApi.del.mockResolvedValueOnce(undefined);
    await goalsService.remove('g-1');
    expect(mockApi.del).toHaveBeenCalledWith('/goals/g-1');
  });
});
