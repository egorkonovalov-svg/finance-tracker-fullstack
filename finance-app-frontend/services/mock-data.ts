import type { Category, Transaction } from '@/types';

// ─── Categories ──────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1',  name: 'Salary',         icon: 'cash',              color: '#10B981', type: 'income'  },
  { id: 'cat-2',  name: 'Freelance',       icon: 'laptop',            color: '#6366F1', type: 'income'  },
  { id: 'cat-3',  name: 'Investments',     icon: 'trending-up',       color: '#8B5CF6', type: 'income'  },
  { id: 'cat-4',  name: 'Food & Drinks',   icon: 'restaurant',        color: '#F59E0B', type: 'expense' },
  { id: 'cat-5',  name: 'Transport',       icon: 'car',               color: '#3B82F6', type: 'expense' },
  { id: 'cat-6',  name: 'Shopping',        icon: 'cart',              color: '#EC4899', type: 'expense' },
  { id: 'cat-7',  name: 'Entertainment',   icon: 'game-controller',   color: '#F97316', type: 'expense' },
  { id: 'cat-8',  name: 'Health',          icon: 'fitness',           color: '#EF4444', type: 'expense' },
  { id: 'cat-9',  name: 'Bills & Utilities', icon: 'flash',           color: '#14B8A6', type: 'expense' },
  { id: 'cat-10', name: 'Education',       icon: 'school',            color: '#0EA5E9', type: 'expense' },
  { id: 'cat-11', name: 'Gifts',           icon: 'gift',              color: '#D946EF', type: 'both'    },
  { id: 'cat-12', name: 'Other',           icon: 'ellipsis-horizontal', color: '#6B7280', type: 'both'  },
];

// ─── Transactions ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1',  type: 'income',  amount: 415000, currency: 'RUB', category: 'Salary',           note: 'Monthly salary',           date: daysAgo(0)  },
  { id: 'tx-2',  type: 'expense', amount: 3900,   currency: 'RUB', category: 'Food & Drinks',    note: 'Lunch at café',            date: daysAgo(0)  },
  { id: 'tx-3',  type: 'expense', amount: 1400,   currency: 'RUB', category: 'Transport',         note: 'Taxi ride',                date: daysAgo(1)  },
  { id: 'tx-4',  type: 'expense', amount: 12000,  currency: 'RUB', category: 'Shopping',          note: 'New headphones',           date: daysAgo(1)  },
  { id: 'tx-5',  type: 'income',  amount: 74000,  currency: 'RUB', category: 'Freelance',         note: 'Logo design project',      date: daysAgo(2)  },
  { id: 'tx-6',  type: 'expense', amount: 6000,   currency: 'RUB', category: 'Entertainment',     note: 'Concert tickets',          date: daysAgo(2)  },
  { id: 'tx-7',  type: 'expense', amount: 20300,  currency: 'RUB', category: 'Bills & Utilities', note: 'Electricity bill',         date: daysAgo(3), recurring: true },
  { id: 'tx-8',  type: 'expense', amount: 3200,   currency: 'RUB', category: 'Food & Drinks',    note: 'Grocery run',              date: daysAgo(3)  },
  { id: 'tx-9',  type: 'expense', amount: 4600,   currency: 'RUB', category: 'Health',            note: 'Gym membership',           date: daysAgo(4), recurring: true },
  { id: 'tx-10', type: 'income',  amount: 13900,  currency: 'RUB', category: 'Investments',       note: 'Dividend payout',          date: daysAgo(5)  },
  { id: 'tx-11', type: 'expense', amount: 2600,   currency: 'RUB', category: 'Food & Drinks',    note: 'Sushi takeout',            date: daysAgo(5)  },
  { id: 'tx-12', type: 'expense', amount: 1200,   currency: 'RUB', category: 'Entertainment',     note: 'Streaming subscription',   date: daysAgo(6), recurring: true },
  { id: 'tx-13', type: 'expense', amount: 7800,   currency: 'RUB', category: 'Shopping',          note: 'Running shoes',            date: daysAgo(7)  },
  { id: 'tx-14', type: 'expense', amount: 920,    currency: 'RUB', category: 'Education',         note: 'Online course',            date: daysAgo(7)  },
  { id: 'tx-15', type: 'income',  amount: 23000,  currency: 'RUB', category: 'Freelance',         note: 'Consulting session',       date: daysAgo(8)  },
  { id: 'tx-16', type: 'expense', amount: 4200,   currency: 'RUB', category: 'Transport',         note: 'Weekly gas fill',          date: daysAgo(9)  },
  { id: 'tx-17', type: 'expense', amount: 18500,  currency: 'RUB', category: 'Gifts',             note: 'Birthday present',         date: daysAgo(10) },
  { id: 'tx-18', type: 'expense', amount: 1700,   currency: 'RUB', category: 'Food & Drinks',    note: 'Morning brunch',           date: daysAgo(11) },
  { id: 'tx-19', type: 'income',  amount: 415000, currency: 'RUB', category: 'Salary',            note: 'Monthly salary',           date: daysAgo(30) },
  { id: 'tx-20', type: 'expense', amount: 110000, currency: 'RUB', category: 'Bills & Utilities', note: 'Rent payment',             date: daysAgo(30), recurring: true },
  { id: 'tx-21', type: 'expense', amount: 6900,   currency: 'RUB', category: 'Health',            note: 'Doctor visit copay',       date: daysAgo(14) },
  { id: 'tx-22', type: 'expense', amount: 2950,   currency: 'RUB', category: 'Food & Drinks',    note: 'Pizza night',              date: daysAgo(12) },
  { id: 'tx-23', type: 'income',  amount: 46000,  currency: 'RUB', category: 'Freelance',         note: 'Website maintenance',      date: daysAgo(15) },
  { id: 'tx-24', type: 'expense', amount: 5100,   currency: 'RUB', category: 'Shopping',          note: 'Book haul',                date: daysAgo(16) },
  { id: 'tx-25', type: 'expense', amount: 9200,   currency: 'RUB', category: 'Education',         note: 'TypeScript masterclass',   date: daysAgo(20) },
];
