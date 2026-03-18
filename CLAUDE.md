# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project history

Originally two separate repos (`finance-app-backend`, `finance-app-frontend`) merged into this monorepo.

## Repository structure

Monorepo with two subdirectories:
- `frontend/` — Expo / React Native app (web), port 8081
- `backend/` — FastAPI / Python 3.12 API, port 8000
- `docker-compose.yml` — orchestrates DB (Postgres 5432), backend (8000), frontend (8081)

## Commands

### Frontend (`frontend/`)
```sh
npx expo start --web      # dev server on http://localhost:8081
npm run lint              # ESLint via expo lint
npm test                  # Jest (test files in __tests__/)
npm test -- --testPathPattern=<file>  # single test file
```

### Backend (`backend/`)
```sh
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
ruff check --fix app    # lint
ruff format app         # format
```

### Full stack via Docker
```sh
docker compose up --build          # all services
docker compose up db app           # backend + DB only
docker compose up frontend         # frontend only
```

**Docker gotchas:**
- After adding new npm dependencies, rebuild with `docker compose build --no-cache frontend` to bust stale cached layers.
- iOS Simulator cannot run from Docker (Linux containers). For iOS dev: run `docker compose up db app` for backend+DB, then run Expo natively on macOS with `npx expo start --ios`.

## Architecture

### Frontend

- **Routing:** Expo Router (file-based). Tab screens in `app/(tabs)/`, auth screens at root level.
- **Global state:** `AppContext` (`context/AppContext.tsx`) — single source of truth for transactions, categories, budgets, goals, currency, locale, and exchange rates. Built on `useReducer`. Accessed via `useApp()`.
- **Auth:** `AuthContext` (`context/AuthContext.tsx`) — JWT with email + 6-digit verification code 2FA. In mock mode any credentials/codes work.
- **Theme:** `ThemeContext` with light/dark/system. Design tokens (colors, spacing, radii, fonts) in `constants/theme.ts`.
- **Services:** `services/api-client.ts` is the HTTP client (checks `EXPO_PUBLIC_USE_MOCK`). Domain services (`transactions.ts`, `budgets.ts`, etc.) call either the real API or return mock data from `services/mock-data.ts`.
- **Currency:** All amounts stored in **RUB**. `useCurrency()` hook exposes `convert()` and `convertAndFormat()` to display amounts in the user's chosen display currency (default: RUB, configurable in Settings). Exchange rates fetched from `open.er-api.com/v6/latest/RUB` with a 1-hour cache (memory + AsyncStorage); fallback rates hardcoded in `services/exchange-rates.ts`. `formatCurrency()` in `constants/theme.ts` uses `Intl.NumberFormat` for locale-aware formatting. When adding/editing transactions, user input in the display currency is divided by the exchange rate before storing as RUB. `CURRENCY_SYMBOLS` and `FALLBACK_RATES` must stay in sync when adding new currencies.
- **i18n:** `locales/en.json` and `locales/ru.json`. `useTranslation()` reads `locale` from `AppContext`. Supports `{{variable}}` interpolation.
- **Font system:** **Manrope** (`@expo-google-fonts/manrope`) — chosen for full Latin + Cyrillic support. `FontFamily` mappings in `constants/theme.ts`: heading → `Manrope_700Bold`, headingMedium → `Manrope_600SemiBold`, body → `Manrope_400Regular`, bodyMedium → `Manrope_500Medium`, bodySemiBold → `Manrope_600SemiBold`.
- **Design specs:** `frontend/figma/figma-screens-spec.json` and `frontend/frontend-instructions/screens-spec.json` are design reference documents used as intermediary between Figma mockups and code.
- **UI conventions:** `Ionicons` for all icons; glass-morphism via `GlassCard` (`components/ui/glass-card.tsx`) with `expo-blur`; haptic feedback via `expo-haptics`.

### Backend

- **Framework:** FastAPI with async SQLAlchemy 2.0 + PostgreSQL.
- **Models:** `app/models/` — User, Transaction, Category, Budget, Goal, VerificationCode.
- **Schemas:** Pydantic v2 in `app/schemas/` for request/response validation.
- **Routers:** `app/routers/` — auth, transactions, categories, budgets, goals, dev. Notable: `GET /transactions/stats?month=YYYY-MM` returns total_income, total_expenses, balance, by_category (with color from categories table), and daily breakdown.
- **Auth:** JWT-based. Email 2FA is 2-step: signup/login returns a `session_id`; client posts `session_id` + 6-digit code to `POST /auth/verify-code` to receive the JWT. `POST /auth/resend-code` invalidates the previous code and returns a new `session_id`. Codes expire in 10 minutes; 5 failed attempts returns 429. `app/dependencies.py` provides `get_current_user`.
- **DB init:** Tables created via `Base.metadata.create_all` on startup (no Alembic migrations in active use). Schema changes require dropping and recreating the DB. The DB container persists across restarts if not explicitly removed.
- **Venv:** Python virtual environment lives at `backend/venv/`.
- **Seed data:** 12 default categories are created for every new user on signup: Salary, Freelance, Investments, Food & Drinks, Transport, Shopping, Entertainment, Health, Bills & Utilities, Education, Gifts, Other.
- **Not managed by backend:** Exchange rates (frontend fetches directly from er-api.com), user preferences/currency/theme/locale (device AsyncStorage), onboarding state (local).
- **API conventions:** IDs are UUIDs; dates are ISO 8601; errors return `{ "detail": "..." }`; deletions return 204 No Content. CORS uses `allow_origins=["*"]` in development.
- **`EXPO_PUBLIC_API_URL`** must be a URL the **browser** can reach — do not use internal Docker hostnames like `http://backend:8000`; use `http://localhost:8000/api/v1` or the host's LAN IP.
- **Email/SMTP:** `app/services/email.py` uses `aiosmtplib`. When SMTP credentials are empty/placeholder, sending is skipped with a log warning. When SMTP is unreachable, a single concise error line is logged (not a full traceback).
- **API base:** `http://localhost:8000/api/v1`. Swagger docs at `http://localhost:8000/docs`.

## Key conventions

- All monetary amounts are stored and transmitted in **RUB**.
- Mock data categories and transaction names are in **Russian** (e.g. "Зарплата", "Еда и напитки"). The `category` field on transactions must match a category `name` exactly.
- Initial Metro bundle takes ~15 seconds — wait before interacting with the UI.
- Frontend defaults to mock mode (`EXPO_PUBLIC_USE_MOCK=true`). Set to `false` and run the backend for real API usage.
- `JWT_SECRET` must be set as an env var when running via Docker (no default).
- Run `npm run lint` and `npm test` from `frontend/` before committing frontend changes.
- The pre-existing lint warning in `verify-code.tsx` (unescaped entity) is known — do not fix unless explicitly asked.
- `"shadow*" style props are deprecated` Metro warnings are cosmetic — ignore them.
- When testing on a physical device or emulator, replace `localhost` in `EXPO_PUBLIC_API_URL` with the machine's LAN IP (`localhost` on a device refers to the device itself).
- Expo env vars are read at startup — restart the Expo process after changing `.env`.
