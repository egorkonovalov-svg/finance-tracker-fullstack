# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Full-stack personal-finance app (monorepo).

- **Frontend:** `finance-app-frontend/` — Expo / React Native (web), port 8081
- **Backend:** `finance-app-backend/` — FastAPI / Python 3.12, port 8000
- **Database:** Docker container on port 5432

The frontend runs standalone with mock data (`EXPO_PUBLIC_USE_MOCK=true` in `finance-app-frontend/.env`), making the backend optional for UI-only work.

### Running services

**Frontend (web — recommended for Cloud agents):**
```sh
cd finance-app-frontend
npx expo start --web          # serves on http://localhost:8081
```

**Backend:**
```sh
cd finance-app-backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Database (only needed when running the real backend):**
```sh
sudo dockerd &>/tmp/dockerd.log &
sleep 3
docker compose up -d           # from repo root; starts the DB service
```
Credentials must match `finance-app-backend/.env` → `DATABASE_URL`. See `docker-compose.yml` for defaults.

### Lint / Test / Build

| What           | Command                                    | Working dir              |
|----------------|--------------------------------------------|--------------------------|
| Frontend lint  | `npm run lint`                             | `finance-app-frontend/`  |
| Frontend tests | `npm test` (Jest, files in `__tests__/`)   | `finance-app-frontend/`  |
| Backend API docs | `http://localhost:8000/docs` (Swagger)   | —                        |

No backend lint or test commands are configured yet.

### Architecture at a glance

**Frontend:**

- **Routing:** Expo Router (file-based). Screens live in `app/`, tab screens in `app/(tabs)/`.
- **State:** Single `AppContext` (`context/AppContext.tsx`) holds transactions, categories, budgets, goals, currency, locale, and exchange rates. Accessed via `useApp()`.
- **Auth:** `AuthContext` (`context/AuthContext.tsx`) handles JWT auth with email+verification-code 2FA. In mock mode any credentials work.
- **Theme:** `ThemeContext` with light/dark/system modes. Design tokens in `constants/theme.ts` (`Palette`, `Colors`, `Spacing`, `Radius`, `FontFamily`, `FontSize`).
- **Services layer:** `services/` contains `api-client.ts` (HTTP client with mock toggle), plus domain services (`transactions.ts`, `budgets.ts`, etc.) that either call the API or return mock data.
- **Currency:** Base currency is **RUB**. `useCurrency()` hook converts stored RUB amounts to the user's display currency using exchange rates fetched from `open.er-api.com/v6/latest/RUB`. Fallback rates in `services/exchange-rates.ts`.
- **i18n:** Two locales (`en`, `ru`) via JSON files in `locales/`. The `useTranslation()` hook reads `locale` from `AppContext`.
- **Mock data:** `services/mock-data.ts` — categories and transactions in Russian with RUB amounts.
- **Types:** All shared TypeScript types in `types/index.ts`.

**Backend:**

- **Models:** SQLAlchemy 2.0 mapped classes in `app/models/` (User, Transaction, Category, Budget, Goal, VerificationCode).
- **Schemas:** Pydantic v2 in `app/schemas/` for request/response validation.
- **Routers:** FastAPI routers in `app/routers/` (auth, transactions, categories, budgets, goals, dev).
- **DB:** Tables auto-created on startup via `Base.metadata.create_all` (no Alembic migrations yet).
- **Auth:** JWT-based. Email 2FA for signup/login.

### Mock mode auth flow

Mock auth accepts **any email/password** and **any 6-digit code**. After verification you land on the Dashboard with pre-populated Russian mock data.

### Key conventions

- All monetary amounts are stored and transmitted in **RUB** (Russian Rubles).
- Category names in mock data are in **Russian** (e.g. "Зарплата", "Еда и напитки").
- The frontend uses `Ionicons` for icons throughout.
- Glass-morphism UI via `GlassCard` component with `expo-blur`.
- Haptic feedback on key interactions via `expo-haptics`.

### Testing guidelines

- Always run `npm run lint` and `npm test` from `finance-app-frontend/` before committing.
- For UI changes, start the frontend with `npx expo start --web` and manually verify in the browser. The initial Metro bundle takes ~15 seconds.
- Mock mode is the default — no backend setup needed for frontend-only work.

### Gotchas

- Docker daemon must be started manually in Cloud (`sudo dockerd &>/tmp/dockerd.log &`) — wait ~3 seconds before issuing docker commands.
- The DB container persists across restarts if not removed.
- Backend auto-creates tables on startup (no migrations). Schema changes require dropping and recreating the DB.
- Frontend `.env` defaults to `EXPO_PUBLIC_USE_MOCK=true`; set to `false` and start the backend to use the real API.
- The backend `.env` lives at `finance-app-backend/.env`; the Python venv is at `finance-app-backend/venv/`.
- `"shadow*" style props are deprecated` warnings in the Metro terminal are cosmetic — ignore them.
- Pre-existing lint warning in `verify-code.tsx` (unescaped entity) is known; do not fix unless explicitly asked.
