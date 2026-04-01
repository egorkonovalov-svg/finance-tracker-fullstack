// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string;
  category: string;
  note?: string;
  date: string; // ISO 8601
  recurring?: boolean;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string;
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
  category_id?: string;
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

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  category: string;
  amount_limit: number;
}

export interface BudgetSummaryItem {
  category: string;
  amount_limit: number;
  amount_spent: number;
  percent_used: number;
}

export interface CreateBudgetPayload {
  category: string;
  amount_limit: number;
}

export type UpdateBudgetPayload = Partial<CreateBudgetPayload>;

// ─── Goal ─────────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  current_amount: number;
  created_at: string; // ISO 8601
}

export interface CreateGoalPayload {
  name: string;
  target_amount: number;
  target_date: string;
  current_amount?: number;
}

export type UpdateGoalPayload = Partial<CreateGoalPayload>;

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
