import { api, USE_MOCK } from './api-client';
import { mockDelay } from '../utils/mock';
import type {
  Budget,
  BudgetSummaryItem,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from '@/types';

// ─── Mock ─────────────────────────────────────────────────────────────────────

let mockStore: Budget[] = [];
let nextId = 1;


async function mockGetAll(): Promise<Budget[]> {
  await mockDelay(200);
  return [...mockStore];
}

async function mockGetSummary(_month?: string): Promise<BudgetSummaryItem[]> {
  await mockDelay(200);
  return mockStore.map((b) => ({
    category: b.category,
    amount_limit: b.amount_limit,
    amount_spent: 0,
    percent_used: 0,
  }));
}

async function mockCreate(data: CreateBudgetPayload): Promise<Budget> {
  await mockDelay(200);
  const existing = mockStore.find((b) => b.category === data.category);
  if (existing) {
    throw new Error(`Budget for category '${data.category}' already exists`);
  }
  const budget: Budget = {
    id: `budget-${++nextId}`,
    category: data.category,
    amount_limit: data.amount_limit,
  };
  mockStore = [...mockStore, budget];
  return budget;
}

async function mockUpdate(id: string, data: UpdateBudgetPayload): Promise<Budget> {
  await mockDelay(200);
  const idx = mockStore.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error(`Budget ${id} not found`);
  mockStore[idx] = { ...mockStore[idx], ...data };
  return { ...mockStore[idx] };
}

async function mockRemove(id: string): Promise<void> {
  await mockDelay(200);
  mockStore = mockStore.filter((b) => b.id !== id);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const budgetsService = {
  getAll(): Promise<Budget[]> {
    if (USE_MOCK) return mockGetAll();
    return api.get<Budget[]>('/budgets');
  },

  getSummary(month?: string): Promise<{ items: BudgetSummaryItem[] }> {
    if (USE_MOCK) return mockGetSummary(month).then((items) => ({ items }));
    return api.get<{ items: BudgetSummaryItem[] }>('/budgets/summary', {
      params: month ? { month } : undefined,
    });
  },

  create(data: CreateBudgetPayload): Promise<Budget> {
    if (USE_MOCK) return mockCreate(data);
    return api.post<Budget>('/budgets', data);
  },

  update(id: string, data: UpdateBudgetPayload): Promise<Budget> {
    if (USE_MOCK) return mockUpdate(id, data);
    return api.put<Budget>(`/budgets/${id}`, data);
  },

  remove(id: string): Promise<void> {
    if (USE_MOCK) return mockRemove(id);
    return api.del(`/budgets/${id}`);
  },
};
