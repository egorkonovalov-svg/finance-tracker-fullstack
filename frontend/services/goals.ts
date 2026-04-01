import { api, USE_MOCK } from './api-client';
import { mockDelay } from '../utils/mock';
import type {
  CreateGoalPayload,
  Goal,
  UpdateGoalPayload,
} from '@/types';

// ─── Mock ─────────────────────────────────────────────────────────────────────

let mockStore: Goal[] = [];
let nextId = 1;


async function mockGetAll(): Promise<Goal[]> {
  await mockDelay(200);
  return [...mockStore];
}

async function mockCreate(data: CreateGoalPayload): Promise<Goal> {
  await mockDelay(200);
  const goal: Goal = {
    id: `goal-${++nextId}`,
    name: data.name,
    target_amount: data.target_amount,
    target_date: data.target_date,
    current_amount: data.current_amount ?? 0,
    created_at: new Date().toISOString(),
  };
  mockStore = [...mockStore, goal];
  return goal;
}

async function mockUpdate(id: string, data: UpdateGoalPayload): Promise<Goal> {
  await mockDelay(200);
  const idx = mockStore.findIndex((g) => g.id === id);
  if (idx === -1) throw new Error(`Goal ${id} not found`);
  mockStore[idx] = { ...mockStore[idx], ...data };
  return { ...mockStore[idx] };
}

async function mockRemove(id: string): Promise<void> {
  await mockDelay(200);
  mockStore = mockStore.filter((g) => g.id !== id);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const goalsService = {
  getAll(): Promise<Goal[]> {
    if (USE_MOCK) return mockGetAll();
    return api.get<Goal[]>('/goals');
  },

  create(data: CreateGoalPayload): Promise<Goal> {
    if (USE_MOCK) return mockCreate(data);
    return api.post<Goal>('/goals', data);
  },

  update(id: string, data: UpdateGoalPayload): Promise<Goal> {
    if (USE_MOCK) return mockUpdate(id, data);
    return api.put<Goal>(`/goals/${id}`, data);
  },

  remove(id: string): Promise<void> {
    if (USE_MOCK) return mockRemove(id);
    return api.del(`/goals/${id}`);
  },
};
