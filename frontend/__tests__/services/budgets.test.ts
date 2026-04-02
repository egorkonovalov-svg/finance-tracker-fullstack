describe('budgetsService — mock path (USE_MOCK=true)', () => {
  let budgetsService: typeof import('@/services/budgets')['budgetsService'];

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
      budgetsService = require('@/services/budgets').budgetsService;
    });
  });

  it('getAll returns empty array on fresh store', async () => {
    const p = budgetsService.getAll();
    await jest.runAllTimersAsync();
    expect(await p).toEqual([]);
  });

  it('create adds a budget and getAll returns it', async () => {
    const pCreate = budgetsService.create({ category: 'Food', amount_limit: 10000 });
    await jest.runAllTimersAsync();
    const budget = await pCreate;
    expect(budget.id).toMatch(/^budget-/);
    expect(budget.category).toBe('Food');
    expect(budget.amount_limit).toBe(10000);

    const pAll = budgetsService.getAll();
    await jest.runAllTimersAsync();
    expect(await pAll).toHaveLength(1);
  });

  it('create throws for duplicate category', async () => {
    const p1 = budgetsService.create({ category: 'Transport', amount_limit: 5000 });
    await jest.runAllTimersAsync();
    await p1;

    const p2 = budgetsService.create({ category: 'Transport', amount_limit: 3000 });
    const assertion = expect(p2).rejects.toThrow("Budget for category 'Transport' already exists");
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('update modifies amount_limit', async () => {
    const pCreate = budgetsService.create({ category: 'Health', amount_limit: 2000 });
    await jest.runAllTimersAsync();
    const created = await pCreate;

    const pUpdate = budgetsService.update(created.id, { amount_limit: 5000 });
    await jest.runAllTimersAsync();
    const updated = await pUpdate;
    expect(updated.amount_limit).toBe(5000);
    expect(updated.id).toBe(created.id);
  });

  it('update throws for unknown id', async () => {
    const p = budgetsService.update('no-such-id', { amount_limit: 1 });
    const assertion = expect(p).rejects.toThrow('Budget no-such-id not found');
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('remove deletes the budget', async () => {
    const pCreate = budgetsService.create({ category: 'Entertainment', amount_limit: 3000 });
    await jest.runAllTimersAsync();
    const created = await pCreate;

    const pRemove = budgetsService.remove(created.id);
    await jest.runAllTimersAsync();
    await pRemove;

    const pAll = budgetsService.getAll();
    await jest.runAllTimersAsync();
    const all = await pAll;
    expect(all.find((b) => b.id === created.id)).toBeUndefined();
  });

  it('getSummary returns items with required fields', async () => {
    const pCreate = budgetsService.create({ category: 'Shopping', amount_limit: 8000 });
    await jest.runAllTimersAsync();
    await pCreate;

    const pSummary = budgetsService.getSummary();
    await jest.runAllTimersAsync();
    const { items } = await pSummary;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      category: 'Shopping',
      amount_limit: 8000,
      amount_spent: 0,
      percent_used: 0,
    });
  });
});

describe('budgetsService — real path (USE_MOCK=false)', () => {
  let budgetsService: typeof import('@/services/budgets')['budgetsService'];
  let mockApi: { get: jest.Mock; post: jest.Mock; put: jest.Mock; del: jest.Mock };

  beforeEach(() => {
    mockApi = { get: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() };
    jest.isolateModules(() => {
      jest.mock('@/services/api-client', () => ({ api: mockApi, USE_MOCK: false }));
      budgetsService = require('@/services/budgets').budgetsService;
    });
  });

  it('getAll calls api.get /budgets', async () => {
    mockApi.get.mockResolvedValueOnce([]);
    await budgetsService.getAll();
    expect(mockApi.get).toHaveBeenCalledWith('/budgets');
  });

  it('getSummary calls api.get /budgets/summary', async () => {
    mockApi.get.mockResolvedValueOnce({ items: [] });
    await budgetsService.getSummary();
    expect(mockApi.get).toHaveBeenCalledWith('/budgets/summary', expect.any(Object));
  });

  it('getSummary passes month param when provided', async () => {
    mockApi.get.mockResolvedValueOnce({ items: [] });
    await budgetsService.getSummary('2026-04');
    expect(mockApi.get).toHaveBeenCalledWith('/budgets/summary', { params: { month: '2026-04' } });
  });

  it('create calls api.post /budgets', async () => {
    mockApi.post.mockResolvedValueOnce({ id: 'b-1', category: 'Food', amount_limit: 10000 });
    await budgetsService.create({ category: 'Food', amount_limit: 10000 });
    expect(mockApi.post).toHaveBeenCalledWith('/budgets', { category: 'Food', amount_limit: 10000 });
  });

  it('update calls api.put /budgets/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ id: 'b-1', category: 'Food', amount_limit: 12000 });
    await budgetsService.update('b-1', { amount_limit: 12000 });
    expect(mockApi.put).toHaveBeenCalledWith('/budgets/b-1', { amount_limit: 12000 });
  });

  it('remove calls api.del /budgets/:id', async () => {
    mockApi.del.mockResolvedValueOnce(undefined);
    await budgetsService.remove('b-1');
    expect(mockApi.del).toHaveBeenCalledWith('/budgets/b-1');
  });
});
