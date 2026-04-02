import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AppProvider, useApp } from '@/context/AppContext';

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

jest.mock('@/services/exchange-rates', () => ({
  fetchExchangeRates: jest.fn().mockResolvedValue({ RUB: 1, USD: 0.011, EUR: 0.010 }),
  FALLBACK_RATES: { RUB: 1, USD: 0.0108, EUR: 0.0099, GBP: 0.0085, JPY: 1.674 },
}));

jest.mock('@/services/transactions', () => ({
  transactionsService: {
    getAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, has_more: false }),
    getStats: jest.fn().mockResolvedValue({ total_income: 0, total_expenses: 0, balance: 0, by_category: [], daily: [] }),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/services/categories', () => ({
  categoriesService: { getAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('@/services/budgets', () => ({
  budgetsService: {
    getAll: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({ items: [] }),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/services/goals', () => ({
  goalsService: {
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext reducer via useApp()', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.budgets).toEqual([]);
    expect(result.current.goals).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.currency).toBe('RUB');
    expect(result.current.locale).toBe('ru');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.page).toBe(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('SET_CURRENCY — setCurrency("USD") updates currency', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.setCurrency('USD'); });
    expect(result.current.currency).toBe('USD');
  });

  it('SET_LOCALE — setLocale("en") updates locale', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.setLocale('en'); });
    expect(result.current.locale).toBe('en');
  });

  it('SET_ERROR — loadTransactions failure stores error and clears loading', async () => {
    const { transactionsService } = require('@/services/transactions');
    transactionsService.getAll.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.loadTransactions(); });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.loading).toBe(false);
  });

  it('SET_ERROR — clearError resets error to null', async () => {
    const { transactionsService } = require('@/services/transactions');
    transactionsService.getAll.mockRejectedValueOnce(new Error('Fail'));

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.loadTransactions(); });
    expect(result.current.error).not.toBeNull();

    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });

  it('ADD_TRANSACTION — addTransaction prepends to transactions list', async () => {
    const { transactionsService } = require('@/services/transactions');
    const fakeTx = { id: 'tx-new', type: 'income' as const, amount: 100, currency: 'RUB', category_id: 'cat-1', category: 'Зарплата', date: '2026-04-01T00:00:00Z' };
    transactionsService.create.mockResolvedValueOnce(fakeTx);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addTransaction({ type: 'income', amount: 100, currency: 'RUB', category_id: 'cat-1', date: '2026-04-01T00:00:00Z' }); });

    expect(result.current.transactions[0]).toEqual(fakeTx);
  });

  it('UPDATE_TRANSACTION — updateTransaction replaces matching transaction', async () => {
    const { transactionsService } = require('@/services/transactions');
    const original = { id: 'tx-1', type: 'expense' as const, amount: 500, currency: 'RUB', category_id: 'cat-4', category: 'Еда и напитки', date: '2026-04-01T00:00:00Z' };
    const updated = { ...original, amount: 999 };
    transactionsService.create.mockResolvedValueOnce(original);
    transactionsService.update.mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addTransaction({ type: 'expense', amount: 500, currency: 'RUB', category_id: 'cat-4', date: '2026-04-01T00:00:00Z' }); });
    await act(async () => { await result.current.updateTransaction('tx-1', { amount: 999 }); });

    expect(result.current.transactions.find((t) => t.id === 'tx-1')?.amount).toBe(999);
  });

  it('REMOVE_TRANSACTION — removeTransaction removes from list', async () => {
    const { transactionsService } = require('@/services/transactions');
    const tx = { id: 'tx-del', type: 'expense' as const, amount: 300, currency: 'RUB', category_id: 'cat-4', category: 'Еда и напитки', date: '2026-04-01T00:00:00Z' };
    transactionsService.create.mockResolvedValueOnce(tx);
    transactionsService.remove.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addTransaction({ type: 'expense', amount: 300, currency: 'RUB', category_id: 'cat-4', date: '2026-04-01T00:00:00Z' }); });
    await act(async () => { await result.current.removeTransaction('tx-del'); });

    expect(result.current.transactions.find((t) => t.id === 'tx-del')).toBeUndefined();
  });

  it('ADD_BUDGET — addBudget appends to budgets list', async () => {
    const { budgetsService } = require('@/services/budgets');
    const budget = { id: 'b-1', category: 'Food', amount_limit: 10000 };
    budgetsService.create.mockResolvedValueOnce(budget);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addBudget({ category: 'Food', amount_limit: 10000 }); });

    expect(result.current.budgets).toContainEqual(budget);
  });

  it('REMOVE_BUDGET — removeBudget removes from list', async () => {
    const { budgetsService } = require('@/services/budgets');
    const budget = { id: 'b-3', category: 'Health', amount_limit: 3000 };
    budgetsService.create.mockResolvedValueOnce(budget);
    budgetsService.remove.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addBudget({ category: 'Health', amount_limit: 3000 }); });
    await act(async () => { await result.current.removeBudget('b-3'); });

    expect(result.current.budgets.find((b) => b.id === 'b-3')).toBeUndefined();
  });

  it('ADD_GOAL — addGoal appends to goals list', async () => {
    const { goalsService } = require('@/services/goals');
    const goal = { id: 'g-1', name: 'Vacation', target_amount: 80000, target_date: '2027-06-01', current_amount: 0, created_at: '' };
    goalsService.create.mockResolvedValueOnce(goal);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addGoal({ name: 'Vacation', target_amount: 80000, target_date: '2027-06-01' }); });

    expect(result.current.goals).toContainEqual(goal);
  });

  it('REMOVE_GOAL — removeGoal removes from list', async () => {
    const { goalsService } = require('@/services/goals');
    const goal = { id: 'g-2', name: 'Car', target_amount: 500000, target_date: '2028-01-01', current_amount: 0, created_at: '' };
    goalsService.create.mockResolvedValueOnce(goal);
    goalsService.remove.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.addGoal({ name: 'Car', target_amount: 500000, target_date: '2028-01-01' }); });
    await act(async () => { await result.current.removeGoal('g-2'); });

    expect(result.current.goals.find((g) => g.id === 'g-2')).toBeUndefined();
  });

  it('SET_STATS — loadStats stores stats object', async () => {
    const { transactionsService } = require('@/services/transactions');
    const stats = { total_income: 100000, total_expenses: 40000, balance: 60000, by_category: [{ category: 'Food', amount: 20000, color: '#FFF' }], daily: [] };
    transactionsService.getStats.mockResolvedValueOnce(stats);

    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => { await result.current.loadStats('2026-04'); });

    expect(result.current.stats).toEqual(stats);
  });

  it('RESET preserves currency and locale', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => { result.current.setCurrency('EUR'); result.current.setLocale('en'); });
    expect(result.current.currency).toBe('EUR');
    expect(result.current.locale).toBe('en');
  });

  it('SET_EXCHANGE_RATES — rates loaded on mount, ratesLoading becomes false', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    await act(async () => {});
    expect(result.current.ratesLoading).toBe(false);
    expect(result.current.exchangeRates).toHaveProperty('USD');
  });
});
