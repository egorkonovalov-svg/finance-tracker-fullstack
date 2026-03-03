// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  note?: string;
  date: string; // ISO 8601
  recurring?: boolean;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  note?: string;
  date: string;
  recurring?: boolean;
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  name: string;
  icon: string;   // Ionicons icon name
  color: string;  // hex color
  type: CategoryType;
}

export interface CreateCategoryPayload {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

// ─── API Helpers ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TransactionStats {
  total_income: number;
  total_expenses: number;
  balance: number;
  by_category: { category: string; amount: number; color: string }[];
  daily: { date: string; income: number; expense: number }[];
}

// ─── Exchange Rates ──────────────────────────────────────────────────────────

export interface ExchangeRatesResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type SupportedCurrency = 'USD' | 'EUR' | 'RUB' | 'GBP' | 'JPY';
export type SupportedLocale = 'en' | 'ru';

export interface UserPreferences {
  currency: SupportedCurrency;
  locale: SupportedLocale;
  theme: 'light' | 'dark' | 'system';
}
