describe('transactionsService — mock path (USE_MOCK=true)', () => {
  let transactionsService: typeof import('@/services/transactions')['transactionsService'];

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
      transactionsService = require('@/services/transactions').transactionsService;
    });
  });

  // ── getAll ──────────────────────────────────────────────────────────────

  it('getAll returns 25 seeded items total, 20 per page', async () => {
    const p = transactionsService.getAll();
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.total).toBe(25);
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(20);
    expect(res.items).toHaveLength(20);
    expect(res.has_more).toBe(true);
  });

  it('getAll filters by type=income returns only income', async () => {
    const p = transactionsService.getAll({ type: 'income' });
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((t) => t.type === 'income')).toBe(true);
  });

  it('getAll filters by type=expense returns only expenses', async () => {
    const p = transactionsService.getAll({ type: 'expense' });
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((t) => t.type === 'expense')).toBe(true);
  });

  it('getAll filters by category_id', async () => {
    const p = transactionsService.getAll({ category_id: 'cat-1' });
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((t) => t.category_id === 'cat-1')).toBe(true);
  });

  it('getAll filters by amount_min and amount_max', async () => {
    const p = transactionsService.getAll({ amount_min: 1000, amount_max: 5000 });
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.items.every((t) => t.amount >= 1000 && t.amount <= 5000)).toBe(true);
  });

  it('getAll respects page_size', async () => {
    const p = transactionsService.getAll({ page: 1, page_size: 5 });
    await jest.runAllTimersAsync();
    const res = await p;
    expect(res.items).toHaveLength(5);
    expect(res.page_size).toBe(5);
    expect(res.has_more).toBe(true);
  });

  it('getAll page 2 returns different items from page 1', async () => {
    const p1 = transactionsService.getAll({ page: 1, page_size: 10 });
    await jest.runAllTimersAsync();
    const res1 = await p1;

    const p2 = transactionsService.getAll({ page: 2, page_size: 10 });
    await jest.runAllTimersAsync();
    const res2 = await p2;

    const ids1 = new Set(res1.items.map((t) => t.id));
    expect(res2.items.every((t) => !ids1.has(t.id))).toBe(true);
  });

  // ── getOne ──────────────────────────────────────────────────────────────

  it('getOne returns correct transaction by id', async () => {
    const p = transactionsService.getOne('tx-1');
    await jest.runAllTimersAsync();
    const tx = await p;
    expect(tx.id).toBe('tx-1');
    expect(tx.type).toBe('income');
    expect(tx.amount).toBe(415000);
  });

  it('getOne throws for unknown id', async () => {
    const p = transactionsService.getOne('non-existent');
    const assertion = expect(p).rejects.toThrow('Transaction non-existent not found');
    await jest.runAllTimersAsync();
    await assertion;
  });

  // ── create ──────────────────────────────────────────────────────────────

  it('create adds transaction and resolves category name from category_id', async () => {
    const payload = {
      type: 'expense' as const,
      amount: 500,
      currency: 'RUB',
      category_id: 'cat-4',
      date: new Date().toISOString(),
    };
    const p = transactionsService.create(payload);
    await jest.runAllTimersAsync();
    const tx = await p;
    expect(tx.id).toMatch(/^tx-/);
    expect(tx.amount).toBe(500);
    expect(tx.category).toBe('Еда и напитки');
  });

  // ── update ──────────────────────────────────────────────────────────────

  it('update modifies an existing transaction', async () => {
    const p = transactionsService.update('tx-2', { amount: 9999, note: 'Updated' });
    await jest.runAllTimersAsync();
    const tx = await p;
    expect(tx.id).toBe('tx-2');
    expect(tx.amount).toBe(9999);
    expect(tx.note).toBe('Updated');
  });

  it('update throws for unknown id', async () => {
    const p = transactionsService.update('no-such', { amount: 1 });
    const assertion = expect(p).rejects.toThrow('Transaction no-such not found');
    await jest.runAllTimersAsync();
    await assertion;
  });

  // ── remove ──────────────────────────────────────────────────────────────

  it('remove deletes a transaction', async () => {
    const pRemove = transactionsService.remove('tx-1');
    await jest.runAllTimersAsync();
    await pRemove;

    const pGet = transactionsService.getOne('tx-1');
    const assertion = expect(pGet).rejects.toThrow('Transaction tx-1 not found');
    await jest.runAllTimersAsync();
    await assertion;
  });

  // ── getStats ────────────────────────────────────────────────────────────

  it('getStats returns total_income, total_expenses, balance, by_category, daily', async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const p = transactionsService.getStats(month);
    await jest.runAllTimersAsync();
    const stats = await p;
    expect(typeof stats.total_income).toBe('number');
    expect(typeof stats.total_expenses).toBe('number');
    expect(stats.balance).toBe(stats.total_income - stats.total_expenses);
    expect(Array.isArray(stats.by_category)).toBe(true);
    expect(stats.daily).toHaveLength(7);
  });

  it('getStats by_category total equals total_expenses', async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const p = transactionsService.getStats(month);
    await jest.runAllTimersAsync();
    const stats = await p;
    const catTotal = stats.by_category.reduce((s, c) => s + c.amount, 0);
    expect(catTotal).toBeCloseTo(stats.total_expenses, 0);
  });

  it('getStats works with no month argument', async () => {
    const p = transactionsService.getStats();
    await jest.runAllTimersAsync();
    const stats = await p;
    expect(stats).toHaveProperty('total_income');
  });
});

describe('transactionsService — real path (USE_MOCK=false)', () => {
  let transactionsService: typeof import('@/services/transactions')['transactionsService'];
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
      transactionsService = require('@/services/transactions').transactionsService;
    });
  });

  it('getAll calls api.get /transactions with filters as params', async () => {
    mockApi.get.mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20, has_more: false });
    const res = await transactionsService.getAll();
    expect(mockApi.get).toHaveBeenCalledWith('/transactions', expect.any(Object));
    expect(res.items).toEqual([]);
  });

  it('getOne calls api.get /transactions/:id', async () => {
    const fakeTx = { id: 'tx-99', type: 'income', amount: 100, currency: 'RUB', category_id: 'cat-1', category: 'Зарплата', date: '2026-04-01T00:00:00Z' };
    mockApi.get.mockResolvedValueOnce(fakeTx);
    const tx = await transactionsService.getOne('tx-99');
    expect(mockApi.get).toHaveBeenCalledWith('/transactions/tx-99');
    expect(tx.id).toBe('tx-99');
  });

  it('create calls api.post /transactions', async () => {
    const payload = { type: 'expense' as const, amount: 200, currency: 'RUB', category_id: 'cat-4', date: '2026-04-01T00:00:00Z' };
    mockApi.post.mockResolvedValueOnce({ ...payload, id: 'tx-new', category: 'Food' });
    await transactionsService.create(payload);
    expect(mockApi.post).toHaveBeenCalledWith('/transactions', payload);
  });

  it('update calls api.put /transactions/:id', async () => {
    mockApi.put.mockResolvedValueOnce({ id: 'tx-1', amount: 999 });
    await transactionsService.update('tx-1', { amount: 999 });
    expect(mockApi.put).toHaveBeenCalledWith('/transactions/tx-1', { amount: 999 });
  });

  it('remove calls api.del /transactions/:id', async () => {
    mockApi.del.mockResolvedValueOnce(undefined);
    await transactionsService.remove('tx-1');
    expect(mockApi.del).toHaveBeenCalledWith('/transactions/tx-1');
  });

  it('getStats calls api.get /transactions/stats with month param', async () => {
    mockApi.get.mockResolvedValueOnce({ total_income: 0, total_expenses: 0, balance: 0, by_category: [], daily: [] });
    await transactionsService.getStats('2026-04');
    expect(mockApi.get).toHaveBeenCalledWith('/transactions/stats', { params: { month: '2026-04' } });
  });
});
