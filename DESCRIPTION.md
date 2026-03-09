# Finance Tracker — Personal Finance App

## What is Finance Tracker?

Finance Tracker is a modern personal-finance application that helps users take control of their money. It lets people track their income and expenses, set budgets for different spending categories, and work toward savings goals — all from a single, beautifully designed interface that works on phones and on the web.

---

## How It Works (The Big Picture)

Think of Finance Tracker as three layers working together, like a restaurant:

1. **The Dining Room (Frontend)** — what the user sees and interacts with. A sleek mobile and web app where you tap buttons, view charts, and enter transactions.
2. **The Kitchen (Backend)** — the behind-the-scenes engine that processes requests, enforces rules, and keeps everything running smoothly.
3. **The Pantry (Database)** — the secure storage where all of the user's financial data lives.

When a user logs a new expense, the app sends that information to the backend, which validates it and stores it in the database. When the user opens their dashboard, the backend retrieves the relevant data and sends it back so the app can display balances, charts, and summaries.

---

## What Can Users Do?

### Sign Up & Log In

Users create an account with their email or sign in with Google or Apple. A six-digit verification code is sent to their email to confirm their identity — the same kind of quick verification used by banking apps.

### Dashboard

The home screen gives a snapshot of the user's financial health at a glance:

- **Current balance** — how much money is available.
- **Income vs. Expenses** — a clear comparison of money coming in and going out.
- **Budget progress** — visual bars showing how close each spending category is to its limit.
- **Goal progress** — how far along savings goals are.
- **Recent transactions** — the latest activity for a quick review.

### Transactions

Users can record every income or expense with details like amount, category, date, and an optional note. Transactions can be searched, filtered by type (income or expense), and grouped by date. If something was entered by mistake, a long press lets you delete it.

### Budgets

Users set monthly spending limits for categories like "Food & Drinks" or "Transport." The app tracks how much has been spent against each limit and warns when a budget is close to being exceeded.

### Savings Goals

Want to save for a vacation or an emergency fund? Users create goals with a target amount and date. The app tracks progress and shows how close they are to reaching each goal.

### Analytics

Visual charts help users understand their spending patterns:

- A **bar chart** shows daily spending over the past week.
- A **pie chart** breaks down expenses by category.
- A **top categories** list highlights where the most money is going.

Users can view analytics by month, quarter, or year.

### Categories

Finance Tracker comes with sensible default categories (Salary, Food & Drinks, Transport, Entertainment, etc.), and users can create their own with a custom name, icon, and color.

### Settings & Personalization

- **Dark mode / Light mode** — choose a theme or follow the system setting.
- **Language** — English and Russian are supported.
- **Currency** — display amounts in USD, EUR, GBP, RUB, or JPY with automatic exchange-rate conversion.

---

## How the Pieces Fit Together

```
┌─────────────────────────────────────────────────┐
│              User's Phone or Browser             │
│  ┌───────────────────────────────────────────┐   │
│  │          Finance Tracker App (Frontend)           │   │
│  │  Dashboard · Transactions · Analytics     │   │
│  │  Budgets & Goals · Settings               │   │
│  └──────────────────┬────────────────────────┘   │
└─────────────────────┼───────────────────────────┘
                      │  requests & responses
                      ▼
┌─────────────────────────────────────────────────┐
│            Finance Tracker Server (Backend)             │
│  Handles login, validates data, calculates      │
│  stats, and enforces business rules             │
└──────────────────┬──────────────────────────────┘
                   │  reads & writes
                   ▼
┌─────────────────────────────────────────────────┐
│              Secure Database                     │
│  Stores user accounts, transactions, budgets,   │
│  goals, and categories                          │
└─────────────────────────────────────────────────┘
```

The app and the server communicate over the internet using a standard, secure protocol. Every request includes an authentication token so only the account owner can access their data.

---

## Data We Store

| What | Why |
|------|-----|
| **User accounts** | Email, name, and secure password so users can log in from any device. |
| **Transactions** | Every income and expense entry with amount, category, date, and notes. |
| **Categories** | The labels users assign to transactions (e.g., "Groceries," "Freelance"). |
| **Budgets** | Monthly spending limits per category. |
| **Goals** | Savings targets with a name, target amount, and deadline. |

All data is private and tied to the individual user's account.

---

## Design & Experience

Finance Tracker is designed to feel modern and approachable:

- **Glassmorphism style** — subtle, frosted-glass card backgrounds that give the interface depth.
- **Color-coded feedback** — green for income, red for expenses, indigo accents throughout.
- **Smooth animations** — elements gently fade and slide into view for a polished feel.
- **Accessibility** — screen-reader labels are included so the app is usable by everyone.

---

## Built With (Non-Technical Summary)

| Layer | Role |
|-------|------|
| **Mobile & Web App** | Built with a cross-platform framework so one codebase runs on iOS, Android, and web browsers. |
| **Server** | A lightweight, high-performance Python server that handles all the logic and data processing. |
| **Database** | An industry-standard relational database that safely stores and organizes all user data. |
| **Infrastructure** | Containerized deployment, meaning the entire system can be started and scaled reliably. |

---

## Key Takeaways for the Presentation

1. **One app, every platform** — users get the same experience on their phone and in their browser.
2. **Real-time financial snapshot** — the dashboard surfaces the most important numbers instantly.
3. **Budgets + Goals** — not just tracking, but actively helping users manage and plan their money.
4. **Visual analytics** — charts make spending patterns easy to understand at a glance.
5. **Privacy first** — each user's data is isolated and protected behind secure authentication.
6. **Beautiful, accessible design** — a modern look that works for everyone.
