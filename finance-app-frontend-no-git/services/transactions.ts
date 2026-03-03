import { api, USE_MOCK } from './api-client';
import { MOCK_TRANSACTIONS } from './mock-data';
import type {
  CreateTransactionPayload,
  PaginatedResponse,
  Transaction,
  TransactionFilters,
  TransactionStats,
  UpdateTransactionPayload,
} from '@/types';

// ─── In-memory mock store ────────────────────────────────────────────────────

let mockStore = [...MOCK_TRANSACTIONS];
let nextId = mockStore.length + 1;

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

function matchesFilters(tx: Transaction, f: TransactionFilters): boolean {
  if (f.type && tx.type !== f.type) return false;
  if (f.category && tx.category !== f.category) return false;
  if (f.date_from && tx.date < f.date_from) return false;
  if (f.date_to && tx.date > f.date_to) return false;
  if (f.amount_min !== undefined && tx.amount < f.amount_min) return false;
  if (f.amount_max !== undefined && tx.amount > f.amount_max) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const inNote = tx.note?.toLowerCase().includes(q);
    const inCat = tx.category.toLowerCase().includes(q);
    if (!inNote && !inCat) return false;
  }
  return true;
}

// ─── Mock implementations ────────────────────────────────────────────────────

async function mockGetTransactions(filters: TransactionFilters = {}): Promise<PaginatedResponse<Transaction>> {
  await delay();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 20;
  const filtered = mockStore
    .filter((tx) => matchesFilters(tx, filters))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, total: filtered.length, page, page_size: pageSize, has_more: start + pageSize < filtered.length };
}

async function mockGetTransaction(id: string): Promise<Transaction> {
  await delay(150);
  const tx = mockStore.find((t) => t.id === id);
  if (!tx) throw new Error(`Transaction ${id} not found`);
  return { ...tx };
}

async function mockCreateTransaction(data: CreateTransactionPayload): Promise<Transaction> {
  await delay(200);
  const tx: Transaction = { ...data, id: `tx-${++nextId}` };
  mockStore = [tx, ...mockStore];
  return tx;
}

async function mockUpdateTransaction(id: string, data: UpdateTransactionPayload): Promise<Transaction> {
  await delay(200);
  const idx = mockStore.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Transaction ${id} not found`);
  mockStore[idx] = { ...mockStore[idx], ...data };
  return { ...mockStore[idx] };
}

async function mockDeleteTransaction(id: string): Promise<void> {
  await delay(150);
  mockStore = mockStore.filter((t) => t.id !== id);
}

async function mockGetStats(month?: string): Promise<TransactionStats> {
  await delay(200);
  const now = new Date();
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = targetMonth.split('-').map(Number);

  const monthTxs = mockStore.filter((tx) => {
    const d = new Date(tx.date);
    return d.getFullYear() === y && d.getMonth() + 1 === m;
  });

  const totalIncome = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const catMap: Record<string, number> = {};
  monthTxs
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
    });

  const byCategory = Object.entries(catMap).map(([category, amount]) => ({
    category,
    amount,
    color: '#6B7280',
  }));

  // daily aggregation for last 7 days
  const daily: TransactionStats['daily'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayTxs = mockStore.filter((tx) => tx.date.slice(0, 10) === dateStr);
    daily.push({
      date: dateStr,
      income: dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }

  return { total_income: totalIncome, total_expenses: totalExpenses, balance: totalIncome - totalExpenses, by_category: byCategory, daily };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const transactionsService = {
  getAll(filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> {
    if (USE_MOCK) return mockGetTransactions(filters ?? {});
    return api.get('/transactions', { params: filters as Record<string, string | number | boolean | undefined> });
  },

  getOne(id: string): Promise<Transaction> {
    if (USE_MOCK) return mockGetTransaction(id);
    return api.get(`/transactions/${id}`);
  },

  create(data: CreateTransactionPayload): Promise<Transaction> {
    if (USE_MOCK) return mockCreateTransaction(data);
    return api.post('/transactions', data);
  },

  update(id: string, data: UpdateTransactionPayload): Promise<Transaction> {
    if (USE_MOCK) return mockUpdateTransaction(id, data);
    return api.put(`/transactions/${id}`, data);
  },

  remove(id: string): Promise<void> {
    if (USE_MOCK) return mockDeleteTransaction(id);
    return api.del(`/transactions/${id}`);
  },

  getStats(month?: string): Promise<TransactionStats> {
    if (USE_MOCK) return mockGetStats(month);
    return api.get('/transactions/stats', { params: { month } });
  },
};
