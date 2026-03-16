# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```

### Full stack via Docker
```sh
docker compose up --build          # all services
docker compose up db app           # backend + DB only
docker compose up frontend         # frontend only
```

## Architecture

### Frontend

- **Routing:** Expo Router (file-based). Tab screens in `app/(tabs)/`, auth screens at root level.
- **Global state:** `AppContext` (`context/AppContext.tsx`) — single source of truth for transactions, categories, budgets, goals, currency, locale, and exchange rates. Accessed via `useApp()`.
- **Auth:** `AuthContext` (`context/AuthContext.tsx`) — JWT with email + 6-digit verification code 2FA. In mock mode any credentials/codes work.
- **Theme:** `ThemeContext` with light/dark/system. Design tokens (colors, spacing, radii, fonts) in `constants/theme.ts`.
- **Services:** `services/api-client.ts` is the HTTP client (checks `EXPO_PUBLIC_USE_MOCK`). Domain services (`transactions.ts`, `budgets.ts`, etc.) call either the real API or return mock data from `services/mock-data.ts`.
- **Currency:** All amounts stored in **RUB**. `useCurrency()` hook converts to the user's display currency via exchange rates fetched from `open.er-api.com/v6/latest/RUB`; fallback rates are hardcoded in `services/exchange-rates.ts`.
- **i18n:** `locales/en.json` and `locales/ru.json`. `useTranslation()` reads `locale` from `AppContext`.
- **UI conventions:** `Ionicons` for all icons; glass-morphism via `GlassCard` (`components/ui/glass-card.tsx`) with `expo-blur`; haptic feedback via `expo-haptics`.

### Backend

- **Framework:** FastAPI with async SQLAlchemy 2.0 + PostgreSQL.
- **Models:** `app/models/` — User, Transaction, Category, Budget, Goal, VerificationCode.
- **Schemas:** Pydantic v2 in `app/schemas/` for request/response validation.
- **Routers:** `app/routers/` — auth, transactions, categories, budgets, goals, dev.
- **Auth:** JWT-based. Email 2FA for signup/login via SMTP. `app/dependencies.py` provides `get_current_user`.
- **DB init:** Tables created via `Base.metadata.create_all` on startup (no Alembic migrations in active use). Schema changes require dropping and recreating the DB.
- **API base:** `http://localhost:8000/api/v1`. Swagger docs at `http://localhost:8000/docs`.

## Key conventions

- All monetary amounts are stored and transmitted in **RUB**.
- Mock data categories and transaction names are in **Russian** (e.g. "Зарплата", "Еда и напитки").
- Frontend defaults to mock mode (`EXPO_PUBLIC_USE_MOCK=true`). Set to `false` and run the backend for real API usage.
- `JWT_SECRET` must be set as an env var when running via Docker (no default).
- Run `npm run lint` and `npm test` from `frontend/` before committing frontend changes.
- The pre-existing lint warning in `verify-code.tsx` (unescaped entity) is known — do not fix unless explicitly asked.
- `"shadow*" style props are deprecated` Metro warnings are cosmetic — ignore them.
