# AGENTS.md — Frontend

## Cursor Cloud specific instructions

### Quick start

```sh
npx expo start --web    # http://localhost:8081
```

Runs entirely with mock data by default (`EXPO_PUBLIC_USE_MOCK=true`). No backend or database needed.

### Commands

| Task  | Command         | Notes                                    |
|-------|-----------------|------------------------------------------|
| Dev   | `npx expo start --web` | Web mode, port 8081                |
| Lint  | `npm run lint`  | Runs `expo lint`                         |
| Test  | `npm test`      | Jest, test files in `__tests__/`         |

### Project structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/               #   Tab screens: index (dashboard), transactions, analytics, budgets-goals, settings, add
  transaction/[id].tsx  #   Transaction detail / edit
  auth.tsx, welcome.tsx, verify-code.tsx, categories.tsx
components/             # Reusable UI (GlassCard, CategoryChip, TransactionRow, etc.)
constants/theme.ts      # Design tokens (Palette, Colors, Spacing, Radius, Fonts) + formatCurrency()
context/                # React contexts (AppContext, AuthContext, ThemeContext)
hooks/                  # Custom hooks (useCurrency, useTranslation, useColorScheme)
services/               # API client, domain services, mock data, exchange rates
  api-client.ts         #   HTTP client; USE_MOCK flag switches between real API and mock
  mock-data.ts          #   Mock categories (Russian names) and transactions (RUB amounts)
  exchange-rates.ts     #   Fetches rates from open.er-api.com with RUB base; caches in memory + AsyncStorage
types/index.ts          # All shared TypeScript interfaces
locales/                # i18n: en.json, ru.json
```

### Currency system

- **Base currency: RUB** — all stored amounts (mock data, API responses) are in Russian Rubles.
- `useCurrency()` hook provides `convert()` and `convertAndFormat()` to display amounts in the user's chosen display currency.
- Exchange rates are fetched from `https://open.er-api.com/v6/latest/RUB` with a 1-hour cache. Hardcoded fallback rates exist for offline use.
- `formatCurrency()` in `constants/theme.ts` uses `Intl.NumberFormat` for locale-aware formatting.
- The default display currency is RUB (configurable in Settings).
- When adding/editing transactions, user input in the display currency is divided by the exchange rate to store as RUB.

### i18n

Two locales: `en` and `ru` (JSON files in `locales/`). The `useTranslation()` hook reads locale from `AppContext`. Supports `{{variable}}` interpolation.

### State management

Single `AppContext` (React Context + `useReducer`) holds all app state: transactions, categories, stats, budgets, goals, currency preference, locale, exchange rates. Accessed via `useApp()` hook.

### Auth flow (mock mode)

Any email + any password → any 6-digit code → Dashboard with mock data. No real auth in mock mode.

### Gotchas

- Initial Metro bundle takes ~15 seconds. Wait for completion before interacting.
- `"shadow*" style props are deprecated` terminal warnings are cosmetic — ignore.
- Pre-existing lint warning in `verify-code.tsx` (unescaped entity) is known.
- Mock categories use Russian names (e.g. "Зарплата", "Транспорт"). Transaction `category` fields must match category `name` fields exactly.
- The `CURRENCY_SYMBOLS` map and `FALLBACK_RATES` in the source should stay in sync if new currencies are added.
- A FastAPI backend exists in `../finance-app-backend/`. See root `AGENTS.md` for backend instructions.
