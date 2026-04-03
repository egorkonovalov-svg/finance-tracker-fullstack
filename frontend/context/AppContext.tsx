import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionsService } from '@/services/transactions';
import { categoriesService } from '@/services/categories';
import { budgetsService } from '@/services/budgets';
import { goalsService } from '@/services/goals';
import { fetchExchangeRates, FALLBACK_RATES } from '@/services/exchange-rates';
import { getErrorMessage } from '@/utils/error';
import { useAuth } from '@/context/AuthContext';
import type {
  Budget,
  BudgetSummaryItem,
  Category,
  CreateBudgetPayload,
  CreateCategoryPayload,
  CreateGoalPayload,
  CreateTransactionPayload,
  Goal,
  SupportedCurrency,
  SupportedLocale,
  Transaction,
  TransactionFilters,
  TransactionStats,
  UpdateBudgetPayload,
  UpdateCategoryPayload,
  UpdateGoalPayload,
  UpdateTransactionPayload,
} from '@/types';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  transactions: Transaction[];
  categories: Category[];
  stats: TransactionStats | null;
  budgets: Budget[];
  budgetSummary: BudgetSummaryItem[] | null;
  goals: Goal[];
  currency: SupportedCurrency;
  locale: SupportedLocale;
  exchangeRates: Record<string, number>;
  ratesLoading: boolean;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

const initialState: AppState = {
  transactions: [],
  categories: [],
  stats: null,
  budgets: [],
  budgetSummary: null,
  goals: [],
  currency: 'RUB',
  locale: 'ru',
  exchangeRates: FALLBACK_RATES,
  ratesLoading: true,
  loading: false,
  error: null,
  page: 1,
  hasMore: true,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * All actions that can be dispatched to the app reducer.
 * Use the context methods returned by {@link useApp} rather than dispatching directly.
 */
type Action =
  /** Set the global loading spinner on or off. */
  | { type: 'SET_LOADING'; loading: boolean }
  /** Set or clear the global error message. Also clears loading. */
  | { type: 'SET_ERROR'; error: string | null }
  /** Replace the transaction list with a fresh page-1 result. */
  | { type: 'SET_TRANSACTIONS'; txs: Transaction[]; hasMore: boolean; page: number }
  /** Append the next page of transactions to the existing list. */
  | { type: 'APPEND_TRANSACTIONS'; txs: Transaction[]; hasMore: boolean; page: number }
  /** Prepend a newly created transaction to the list. */
  | { type: 'ADD_TRANSACTION'; tx: Transaction }
  /** Replace a transaction in the list with an updated version. */
  | { type: 'UPDATE_TRANSACTION'; tx: Transaction }
  /** Remove a transaction from the list by id. */
  | { type: 'REMOVE_TRANSACTION'; id: string }
  /** Replace the full category list. */
  | { type: 'SET_CATEGORIES'; cats: Category[] }
  /** Append a newly created category to the list. */
  | { type: 'ADD_CATEGORY'; cat: Category }
  /** Replace a category in the list with an updated version. */
  | { type: 'UPDATE_CATEGORY'; cat: Category }
  /** Remove a category from the list by id. */
  | { type: 'REMOVE_CATEGORY'; id: string }
  /** Set the aggregated transaction statistics. */
  | { type: 'SET_STATS'; stats: TransactionStats }
  /** Replace the full budget list. */
  | { type: 'SET_BUDGETS'; budgets: Budget[] }
  /** Set or clear the per-category budget summary for a given month. */
  | { type: 'SET_BUDGET_SUMMARY'; items: BudgetSummaryItem[] | null }
  /** Append a newly created budget to the list. */
  | { type: 'ADD_BUDGET'; budget: Budget }
  /** Replace a budget in the list with an updated version. */
  | { type: 'UPDATE_BUDGET'; budget: Budget }
  /** Remove a budget from the list by id. */
  | { type: 'REMOVE_BUDGET'; id: string }
  /** Replace the full goal list. */
  | { type: 'SET_GOALS'; goals: Goal[] }
  /** Append a newly created goal to the list. */
  | { type: 'ADD_GOAL'; goal: Goal }
  /** Replace a goal in the list with an updated version. */
  | { type: 'UPDATE_GOAL'; goal: Goal }
  /** Remove a goal from the list by id. */
  | { type: 'REMOVE_GOAL'; id: string }
  /** Set the user's selected display currency. */
  | { type: 'SET_CURRENCY'; currency: SupportedCurrency }
  /** Set the user's selected locale. */
  | { type: 'SET_LOCALE'; locale: SupportedLocale }
  /** Replace the exchange-rate map and mark rates as loaded. */
  | { type: 'SET_EXCHANGE_RATES'; rates: Record<string, number> }
  /** Set the exchange-rate loading flag. */
  | { type: 'SET_RATES_LOADING'; loading: boolean }
  /**
   * Reset all financial data to initial state.
   * Currency, locale, and exchange rates are preserved so the UI
   * stays in the user's preferred language/currency after logout.
   */
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.txs, hasMore: action.hasMore, page: action.page, loading: false };
    case 'APPEND_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.txs], hasMore: action.hasMore, page: action.page, loading: false };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.tx.id ? action.tx : t)) };
    case 'REMOVE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.cats };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.cat] };
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map((c) => (c.id === action.cat.id ? action.cat : c)) };
    case 'REMOVE_CATEGORY':
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    case 'SET_STATS':
      return { ...state, stats: action.stats };
    case 'SET_BUDGETS':
      return { ...state, budgets: action.budgets };
    case 'SET_BUDGET_SUMMARY':
      return { ...state, budgetSummary: action.items };
    case 'ADD_BUDGET':
      return { ...state, budgets: [...state.budgets, action.budget] };
    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map((b) => (b.id === action.budget.id ? action.budget : b)) };
    case 'REMOVE_BUDGET':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id) };
    case 'SET_GOALS':
      return { ...state, goals: action.goals };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)) };
    case 'REMOVE_GOAL':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency };
    case 'SET_LOCALE':
      return { ...state, locale: action.locale };
    case 'SET_EXCHANGE_RATES':
      return { ...state, exchangeRates: action.rates, ratesLoading: false };
    case 'SET_RATES_LOADING':
      return { ...state, ratesLoading: action.loading };
    case 'RESET':
      return {
        ...initialState,
        currency: state.currency,
        locale: state.locale,
        exchangeRates: state.exchangeRates,
        ratesLoading: state.ratesLoading,
      } as AppState;
    default:
      return state;
  }
}

// ─── Context value ───────────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  loadTransactions: (filters?: TransactionFilters) => Promise<void>;
  loadMore: (filters?: TransactionFilters) => Promise<void>;
  addTransaction: (data: CreateTransactionPayload) => Promise<Transaction>;
  updateTransaction: (id: string, data: UpdateTransactionPayload) => Promise<Transaction>;
  removeTransaction: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  addCategory: (data: CreateCategoryPayload) => Promise<Category>;
  updateCategory: (id: string, data: UpdateCategoryPayload) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  loadStats: (month?: string) => Promise<void>;
  loadBudgets: () => Promise<void>;
  loadBudgetSummary: (month?: string) => Promise<void>;
  addBudget: (data: CreateBudgetPayload) => Promise<Budget>;
  updateBudget: (id: string, data: UpdateBudgetPayload) => Promise<Budget>;
  removeBudget: (id: string) => Promise<void>;
  loadGoals: () => Promise<void>;
  addGoal: (data: CreateGoalPayload) => Promise<Goal>;
  updateGoal: (id: string, data: UpdateGoalPayload) => Promise<Goal>;
  removeGoal: (id: string) => Promise<void>;
  setCurrency: (c: SupportedCurrency) => void;
  setLocale: (l: SupportedLocale) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CURRENCY_KEY = '@fintrack_currency';
const LOCALE_KEY = '@fintrack_locale';

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Provides all app state and data-mutation methods to the component tree.
 *
 * Responsibilities:
 * - Loads persisted `currency` and `locale` from AsyncStorage on mount.
 * - Fetches live exchange rates on mount.
 * - Resets all financial data on logout while preserving currency and locale.
 * - Triggers a full `refresh()` when the user becomes authenticated.
 *
 * Must be rendered inside `AuthProvider`.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <AppProvider>
 *     <App />
 *   </AppProvider>
 * </AuthProvider>
 * ```
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Load persisted currency and locale
  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then((v) => {
      if (v) dispatch({ type: 'SET_CURRENCY', currency: v as SupportedCurrency });
    });
    AsyncStorage.getItem(LOCALE_KEY).then((v) => {
      if (v === 'en' || v === 'ru') dispatch({ type: 'SET_LOCALE', locale: v });
    });
  }, []);

  // Clear app data on logout; refetch when user becomes authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
    }
  }, [isAuthenticated, authLoading]);

  // ── Transactions ─────────────────────────────────────────────────────────

  const loadTransactions = useCallback(async (filters?: TransactionFilters) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const res = await transactionsService.getAll({ ...filters, page: 1, page_size: 20 });
      dispatch({ type: 'SET_TRANSACTIONS', txs: res.items, hasMore: res.has_more, page: 1 });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  const loadMore = useCallback(async (filters?: TransactionFilters) => {
    if (state.loading || !state.hasMore) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const nextPage = state.page + 1;
      const res = await transactionsService.getAll({ ...filters, page: nextPage, page_size: 20 });
      dispatch({ type: 'APPEND_TRANSACTIONS', txs: res.items, hasMore: res.has_more, page: nextPage });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, [state.loading, state.hasMore, state.page]);

  const addTransaction = useCallback(async (data: CreateTransactionPayload) => {
    const tx = await transactionsService.create(data);
    dispatch({ type: 'ADD_TRANSACTION', tx });
    return tx;
  }, []);

  const updateTransaction = useCallback(async (id: string, data: UpdateTransactionPayload) => {
    const tx = await transactionsService.update(id, data);
    dispatch({ type: 'UPDATE_TRANSACTION', tx });
    return tx;
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await transactionsService.remove(id);
    dispatch({ type: 'REMOVE_TRANSACTION', id });
  }, []);

  // ── Categories ───────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoriesService.getAll();
      dispatch({ type: 'SET_CATEGORIES', cats });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  const addCategory = useCallback(async (data: CreateCategoryPayload) => {
    const cat = await categoriesService.create(data);
    dispatch({ type: 'ADD_CATEGORY', cat });
    return cat;
  }, []);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryPayload) => {
    const cat = await categoriesService.update(id, data);
    dispatch({ type: 'UPDATE_CATEGORY', cat });
    return cat;
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await categoriesService.remove(id);
    dispatch({ type: 'REMOVE_CATEGORY', id });
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────

  const loadStats = useCallback(async (month?: string) => {
    try {
      const stats = await transactionsService.getStats(month);
      dispatch({ type: 'SET_STATS', stats });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  // ── Budgets ──────────────────────────────────────────────────────────────

  const loadBudgets = useCallback(async () => {
    try {
      const budgets = await budgetsService.getAll();
      dispatch({ type: 'SET_BUDGETS', budgets });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  const loadBudgetSummary = useCallback(async (month?: string) => {
    try {
      const { items } = await budgetsService.getSummary(month);
      dispatch({ type: 'SET_BUDGET_SUMMARY', items });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  const addBudget = useCallback(async (data: CreateBudgetPayload) => {
    const budget = await budgetsService.create(data);
    dispatch({ type: 'ADD_BUDGET', budget });
    return budget;
  }, []);

  const updateBudget = useCallback(async (id: string, data: UpdateBudgetPayload) => {
    const budget = await budgetsService.update(id, data);
    dispatch({ type: 'UPDATE_BUDGET', budget });
    return budget;
  }, []);

  const removeBudget = useCallback(async (id: string) => {
    await budgetsService.remove(id);
    dispatch({ type: 'REMOVE_BUDGET', id });
  }, []);

  // ── Goals ──────────────────────────────────────────────────────────────────

  const loadGoals = useCallback(async () => {
    try {
      const goals = await goalsService.getAll();
      dispatch({ type: 'SET_GOALS', goals });
    } catch (e: unknown) {
      dispatch({ type: 'SET_ERROR', error: getErrorMessage(e) });
    }
  }, []);

  const addGoal = useCallback(async (data: CreateGoalPayload) => {
    const goal = await goalsService.create(data);
    dispatch({ type: 'ADD_GOAL', goal });
    return goal;
  }, []);

  const updateGoal = useCallback(async (id: string, data: UpdateGoalPayload) => {
    const goal = await goalsService.update(id, data);
    dispatch({ type: 'UPDATE_GOAL', goal });
    return goal;
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await goalsService.remove(id);
    dispatch({ type: 'REMOVE_GOAL', id });
  }, []);

  // ── Currency ─────────────────────────────────────────────────────────────

  const setCurrency = useCallback((c: SupportedCurrency) => {
    dispatch({ type: 'SET_CURRENCY', currency: c });
    AsyncStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const setLocale = useCallback((l: SupportedLocale) => {
    dispatch({ type: 'SET_LOCALE', locale: l });
    AsyncStorage.setItem(LOCALE_KEY, l);
  }, []);

  // ── Exchange Rates ─────────────────────────────────────────────────────

  const loadExchangeRates = useCallback(async () => {
    dispatch({ type: 'SET_RATES_LOADING', loading: true });
    try {
      const rates = await fetchExchangeRates();
      dispatch({ type: 'SET_EXCHANGE_RATES', rates });
    } catch {
      dispatch({ type: 'SET_RATES_LOADING', loading: false });
    }
  }, []);

  // Fetch rates on mount
  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  // ── Refresh all ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    dispatch({ type: 'SET_ERROR', error: null });
    await Promise.all([
      loadTransactions(),
      loadCategories(),
      loadStats(),
      loadBudgets(),
      loadBudgetSummary(),
      loadGoals(),
    ]);
  }, [loadTransactions, loadCategories, loadStats, loadBudgets, loadBudgetSummary, loadGoals]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
  }, []);

  // Initial load when authenticated
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        loadTransactions,
        loadMore,
        addTransaction,
        updateTransaction,
        removeTransaction,
        loadCategories,
        addCategory,
        updateCategory,
        removeCategory,
        loadStats,
        loadBudgets,
        loadBudgetSummary,
        addBudget,
        updateBudget,
        removeBudget,
        loadGoals,
        addGoal,
        updateGoal,
        removeGoal,
        setCurrency,
        setLocale,
        refresh,
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * Access the global app state and all data-mutation methods.
 *
 * Must be called inside an {@link AppProvider}.
 *
 * @returns Full {@link AppContextValue} — state fields plus CRUD methods for
 *   transactions, categories, budgets, goals, and user preferences.
 * @throws {Error} If called outside an `AppProvider`.
 *
 * @example
 * ```tsx
 * const { transactions, addTransaction } = useApp();
 * ```
 */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
