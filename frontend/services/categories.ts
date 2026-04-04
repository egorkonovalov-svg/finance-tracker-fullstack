import { api, USE_MOCK } from './api-client';
import { mockDelay } from '../utils/mock';
import { MOCK_CATEGORIES } from './mock-data';
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types';

// ─── In-memory mock store ────────────────────────────────────────────────────

let mockStore = [...MOCK_CATEGORIES];
let nextId = mockStore.length + 1;


async function mockGetCategories(): Promise<Category[]> {
  await mockDelay(200);
  return [...mockStore];
}

async function mockCreateCategory(data: CreateCategoryPayload): Promise<Category> {
  await mockDelay(200);
  const cat: Category = { ...data, id: `cat-${++nextId}` };
  mockStore = [...mockStore, cat];
  return cat;
}

async function mockUpdateCategory(id: string, data: UpdateCategoryPayload): Promise<Category> {
  await mockDelay(200);
  const idx = mockStore.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Category ${id} not found`);
  mockStore[idx] = { ...mockStore[idx], ...data };
  return { ...mockStore[idx] };
}

async function mockDeleteCategory(id: string): Promise<void> {
  await mockDelay(100);
  mockStore = mockStore.filter((c) => c.id !== id);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const categoriesService = {
  getAll(): Promise<Category[]> {
    if (USE_MOCK) return mockGetCategories();
    return api.get('/categories');
  },

  create(data: CreateCategoryPayload): Promise<Category> {
    if (USE_MOCK) return mockCreateCategory(data);
    return api.post('/categories', data);
  },

  update(id: string, data: UpdateCategoryPayload): Promise<Category> {
    if (USE_MOCK) return mockUpdateCategory(id, data);
    return api.put(`/categories/${id}`, data);
  },

  remove(id: string): Promise<void> {
    if (USE_MOCK) return mockDeleteCategory(id);
    return api.del(`/categories/${id}`);
  },
};
