import type { Category, Transaction } from '@/types';

// ─── Categories ──────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1',  name: 'Зарплата',        icon: 'cash',              color: '#10B981', type: 'income'  },
  { id: 'cat-2',  name: 'Фриланс',         icon: 'laptop',            color: '#6366F1', type: 'income'  },
  { id: 'cat-3',  name: 'Инвестиции',      icon: 'trending-up',       color: '#8B5CF6', type: 'income'  },
  { id: 'cat-4',  name: 'Еда и напитки',   icon: 'restaurant',        color: '#F59E0B', type: 'expense' },
  { id: 'cat-5',  name: 'Транспорт',       icon: 'car',               color: '#3B82F6', type: 'expense' },
  { id: 'cat-6',  name: 'Покупки',         icon: 'cart',              color: '#EC4899', type: 'expense' },
  { id: 'cat-7',  name: 'Развлечения',     icon: 'game-controller',   color: '#F97316', type: 'expense' },
  { id: 'cat-8',  name: 'Здоровье',        icon: 'fitness',           color: '#EF4444', type: 'expense' },
  { id: 'cat-9',  name: 'Счета и услуги',  icon: 'flash',             color: '#14B8A6', type: 'expense' },
  { id: 'cat-10', name: 'Образование',     icon: 'school',            color: '#0EA5E9', type: 'expense' },
  { id: 'cat-11', name: 'Подарки',         icon: 'gift',              color: '#D946EF', type: 'both'    },
  { id: 'cat-12', name: 'Прочее',          icon: 'ellipsis-horizontal', color: '#6B7280', type: 'both'  },
];

// ─── Transactions ────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1',  type: 'income',  amount: 415000, currency: 'RUB', category: 'Зарплата',        note: 'Ежемесячная зарплата',       date: daysAgo(0)  },
  { id: 'tx-2',  type: 'expense', amount: 3900,   currency: 'RUB', category: 'Еда и напитки',   note: 'Обед в кафе',                date: daysAgo(0)  },
  { id: 'tx-3',  type: 'expense', amount: 1400,   currency: 'RUB', category: 'Транспорт',        note: 'Поездка на такси',           date: daysAgo(1)  },
  { id: 'tx-4',  type: 'expense', amount: 12000,  currency: 'RUB', category: 'Покупки',          note: 'Новые наушники',             date: daysAgo(1)  },
  { id: 'tx-5',  type: 'income',  amount: 74000,  currency: 'RUB', category: 'Фриланс',          note: 'Дизайн логотипа',            date: daysAgo(2)  },
  { id: 'tx-6',  type: 'expense', amount: 6000,   currency: 'RUB', category: 'Развлечения',      note: 'Билеты на концерт',          date: daysAgo(2)  },
  { id: 'tx-7',  type: 'expense', amount: 20300,  currency: 'RUB', category: 'Счета и услуги',   note: 'Счёт за электричество',      date: daysAgo(3), recurring: true },
  { id: 'tx-8',  type: 'expense', amount: 3200,   currency: 'RUB', category: 'Еда и напитки',   note: 'Продукты в магазине',         date: daysAgo(3)  },
  { id: 'tx-9',  type: 'expense', amount: 4600,   currency: 'RUB', category: 'Здоровье',         note: 'Абонемент в спортзал',       date: daysAgo(4), recurring: true },
  { id: 'tx-10', type: 'income',  amount: 13900,  currency: 'RUB', category: 'Инвестиции',       note: 'Выплата дивидендов',         date: daysAgo(5)  },
  { id: 'tx-11', type: 'expense', amount: 2600,   currency: 'RUB', category: 'Еда и напитки',   note: 'Суши на вынос',              date: daysAgo(5)  },
  { id: 'tx-12', type: 'expense', amount: 1200,   currency: 'RUB', category: 'Развлечения',      note: 'Подписка на стриминг',       date: daysAgo(6), recurring: true },
  { id: 'tx-13', type: 'expense', amount: 7800,   currency: 'RUB', category: 'Покупки',          note: 'Беговые кроссовки',          date: daysAgo(7)  },
  { id: 'tx-14', type: 'expense', amount: 920,    currency: 'RUB', category: 'Образование',      note: 'Онлайн-курс',               date: daysAgo(7)  },
  { id: 'tx-15', type: 'income',  amount: 23000,  currency: 'RUB', category: 'Фриланс',          note: 'Консультация',              date: daysAgo(8)  },
  { id: 'tx-16', type: 'expense', amount: 4200,   currency: 'RUB', category: 'Транспорт',        note: 'Заправка на неделю',         date: daysAgo(9)  },
  { id: 'tx-17', type: 'expense', amount: 18500,  currency: 'RUB', category: 'Подарки',          note: 'Подарок на день рождения',   date: daysAgo(10) },
  { id: 'tx-18', type: 'expense', amount: 1700,   currency: 'RUB', category: 'Еда и напитки',   note: 'Утренний бранч',             date: daysAgo(11) },
  { id: 'tx-19', type: 'income',  amount: 415000, currency: 'RUB', category: 'Зарплата',         note: 'Ежемесячная зарплата',       date: daysAgo(30) },
  { id: 'tx-20', type: 'expense', amount: 110000, currency: 'RUB', category: 'Счета и услуги',   note: 'Оплата аренды',              date: daysAgo(30), recurring: true },
  { id: 'tx-21', type: 'expense', amount: 6900,   currency: 'RUB', category: 'Здоровье',         note: 'Приём у врача',              date: daysAgo(14) },
  { id: 'tx-22', type: 'expense', amount: 2950,   currency: 'RUB', category: 'Еда и напитки',   note: 'Вечер с пиццей',             date: daysAgo(12) },
  { id: 'tx-23', type: 'income',  amount: 46000,  currency: 'RUB', category: 'Фриланс',          note: 'Обслуживание сайта',         date: daysAgo(15) },
  { id: 'tx-24', type: 'expense', amount: 5100,   currency: 'RUB', category: 'Покупки',          note: 'Закупка книг',               date: daysAgo(16) },
  { id: 'tx-25', type: 'expense', amount: 9200,   currency: 'RUB', category: 'Образование',      note: 'Курс по TypeScript',         date: daysAgo(20) },
];
