# Finance Tracker — Refactoring & Documentation Plan

A step-by-step guide for cleaning up, refactoring, and documenting the codebase.
Work through each phase in order; tasks within a phase can be done in any order.

---

## Phase 1: Critical Fixes

These should be addressed before any other refactoring work.

### 1.1 Fix `_INSECURE_JWT_SECRET` reference in config
- **File:** `backend/app/config.py` (~line 36)
- The code references `_INSECURE_JWT_SECRET` which is never defined — this will crash on import.
- Define the constant at the top of the file or remove the check entirely. DONE

### 1.2 Pin dependency versions
- **File:** `backend/requirements.txt`
- Every package is unpinned (e.g. `fastapi`, `sqlalchemy[asyncio]`, `pydantic`).
- Run `pip freeze` inside the venv and pin all versions with `==`.
- **File:** `frontend/package.json`
- Versions use `^` (minor updates allowed) — consider locking with `npm ci` + `package-lock.json` committed.

### 1.3 Add error boundaries to frontend
- Create `frontend/components/ErrorBoundary.tsx` (class component with `componentDidCatch`).
- Wrap the root layout (`frontend/app/_layout.tsx`) with it so a single component crash doesn't kill the app.

---

## Phase 2: Backend Cleanup

### 2.1 Extract shared CRUD helpers

The same 404-check-and-raise pattern is repeated across every router:

```
transactions.py  — lines ~140, ~172, ~197
budgets.py       — lines ~115, ~153
categories.py    — lines ~58, ~88
goals.py         — lines ~64, ~89
```

Create a utility (e.g. `backend/app/utils.py`):

```python
async def get_or_404(db, model, id, user_id, detail="Not found"):
    obj = await db.get(model, id)
    if not obj or obj.user_id != user_id:
        raise HTTPException(404, detail=detail)
    return obj
```

Replace all the inline checks with calls to this helper.

### 2.2 Consolidate `_to_response()` functions

Each router has its own `_to_response()` that converts an ORM model to a Pydantic schema:

- `routers/transactions.py` — `_to_response()` (lines 23–33)
- `routers/budgets.py` — `_to_response()` (lines 23–28)
- `routers/goals.py` — `_to_response()` (lines 15–23)
- `routers/categories.py` — inline transformation

Options:
- Add a `.to_schema()` method on each SQLAlchemy model, or
- Use `model_validate()` with `from_attributes=True` in the Pydantic schema directly.

### 2.3 Move hardcoded constants to config

Collect all magic numbers/strings and move them to `backend/app/config.py`:

| Current location | Value | Suggested constant |
|---|---|---|
| `routers/auth.py:43` | `MAX_RESENDS = 3` | `settings.MAX_CODE_RESENDS` |
| `services/auth.py:19` | `MAX_VERIFICATION_ATTEMPTS = 5` | `settings.MAX_VERIFICATION_ATTEMPTS` |
| `services/auth.py:59` | Apple keys URL | `settings.APPLE_KEYS_URL` |
| `services/auth.py:62` | `_APPLE_KEYS_TTL = 3600` | `settings.APPLE_KEYS_TTL` |
| `services/stats.py:42` | `"#6B7280"` (default color) | `DEFAULT_CATEGORY_COLOR` |
| `routers/auth.py` | Rate limit strings `"5/minute"` etc. | Constants at top of file |
| `services/auth.py:195–208` | `DEFAULT_CATEGORIES` list | Move to a JSON/YAML config file or a `constants.py` |

### 2.4 Split `auth.py` router (278 lines)

The auth router handles too many concerns. Split into logical sections:

1. **`social_auth()` (lines 203–260):** Extract provider-specific logic into:
   - `_handle_google_auth(token, db)`
   - `_handle_apple_auth(token, db)`
2. **`signup()` (lines 63–99):** Extract user creation/update logic into a service function in `services/auth.py` (e.g. `get_or_create_user()`).
3. **`_seed_categories()` (line 46–48):** Move to `services/auth.py` or a dedicated `services/categories.py`.

### 2.5 Split `services/auth.py` — `verify_apple_id_token()` (50 lines)

Break into smaller functions:
- `_fetch_apple_public_keys()` — already exists but undocumented
- `_find_matching_key(keys, kid)` — extract key lookup
- `_validate_apple_jwt(token, public_key)` — extract JWT validation

### 2.6 Split `services/stats.py` — `get_monthly_stats()` (93 lines)

Break into:
- `_get_income_expense_totals(db, user_id, start, end)` — the aggregate query
- `_get_by_category_breakdown(db, user_id, start, end)` — the category join
- `_get_daily_breakdown(db, user_id, start, end)` — the daily aggregation
- `get_monthly_stats()` ties them together

### 2.7 Improve error handling consistency

Currently errors are handled inconsistently:
- Some routers validate in the handler, others in the service layer.
- `services/email.py` silently swallows errors (logs but returns `None`).
- `except Exception:` is too broad in `verify_apple_id_token`.

Rules to apply:
1. Input validation → Pydantic schemas (already mostly done).
2. Business logic errors → raise specific exceptions from service layer.
3. Routers catch service exceptions and map to `HTTPException`.
4. Replace `except Exception:` with specific exception types.
5. `email.py` should raise on failure so callers can decide how to handle it.

### 2.8 Add missing schema validations

- **`schemas/budget.py`:** Add `Field(gt=0)` to `amount_limit`.
- **`schemas/goal.py`:** Add validator that `target_date` is in the future; add `current_amount <= target_amount` check.
- **`routers/transactions.py`:** Add max length to `search` query param (e.g. `Query(max_length=200)`).

### 2.9 Fix category–transaction relationship

Currently transactions reference categories by name (string), not by ID. This means renaming a category silently breaks referential integrity.

- Add `category_id: UUID` foreign key to the `Transaction` model.
- Keep `category` (name) as a denormalized read field or remove it.
- Update all queries in `routers/transactions.py` and `services/stats.py`.

> **Note:** This is a schema change — requires dropping and recreating the DB (per CLAUDE.md).

### 2.10 Replace in-memory token blocklist

- **File:** `services/auth.py` (lines 21–34)
- Current blocklist uses a Python `set` + `threading.Lock` — doesn't survive restarts.
- Options:
  - Store blocked tokens in PostgreSQL (add `BlockedToken` model with expiry).
  - Use Redis if available.
- Add a cleanup job that removes expired tokens periodically.

---

## Phase 3: Frontend Cleanup

### 3.1 Fix `any` types

- **`app/transaction/[id].tsx` (~line 149):** `colors: any` → use proper `Colors` type from theme.
- **All `(e as Error).message` casts** (7+ occurrences in `context/AppContext.tsx`, `app/auth.tsx`, etc.):
  Create a shared utility:
  ```typescript
  // utils/error.ts
  export function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'Unknown error';
  }
  ```
  Replace all `(e as Error).message` with `getErrorMessage(e)`.

### 3.2 Split large components

**`app/auth.tsx` (~280 lines):**
- Extract `EmailPasswordForm` component (form fields + validation).
- Extract `SocialAuthButtons` component (Google/Apple buttons).
- Extract hooks: `useEmailPasswordAuth()`, `useSocialAuth()`.

**`app/verify-code.tsx` (~12KB):**
- Extract `CodeInput` component (the 6-digit input UI).
- Extract `useVerificationCode()` hook (timer, resend logic, attempt tracking).

**`app/transaction/[id].tsx`:**
- Extract `TransactionForm` component (shared between create and edit).
- Extract `useDatePicker()` hook if date-picking logic is complex.

### 3.3 Deduplicate error message extraction

The `extractErrorMessage()` helper appears in multiple files:
- `app/auth.tsx` (lines 29–36)
- `app/verify-code.tsx`
- `services/auth.ts` (lines 77–92)

Consolidate into a single `utils/error.ts` (see 3.1 above).

### 3.4 Deduplicate mock delay pattern

Each service file reimplements mock response delays:
- `services/transactions.ts`
- `services/auth.ts`
- `services/budgets.ts`, `services/goals.ts`, etc.

Create a shared utility:
```typescript
// utils/mock.ts
export const mockDelay = (ms = 300) => new Promise(r => setTimeout(r, ms));
```

### 3.5 Simplify API client URL handling

**`services/api-client.ts` (lines 43–44):** Complex `window.location.origin` fallback logic is unnecessary in an Expo app. Simplify to just use `BASE_URL` directly.

### 3.6 Add `typecheck` script

**`frontend/package.json`:** Add:
```json
"typecheck": "tsc --noEmit"
```
Run it before committing alongside `npm run lint`.

### 3.7 Clean up unused API client methods

**`services/api-client.ts` (~line 112):** `.patch()` method is defined but never called. If no endpoint uses PATCH, remove it. If it's planned, leave it but add a `// Used by: <future endpoint>` comment.

---

## Phase 4: Testing

### 4.1 Backend — add pytest setup

- Add `pytest`, `pytest-asyncio`, `httpx` to `requirements.txt` (dev section or separate `requirements-dev.txt`).
- Create `backend/tests/conftest.py` with:
  - Test database fixture (SQLite in-memory or test Postgres).
  - `AsyncClient` fixture for FastAPI TestClient.
  - Auth fixtures (create user, get token).

### 4.2 Backend — write tests (priority order)

1. **Auth flows:** signup → verify code → login → verify code → get token → logout.
2. **Transaction CRUD:** create, list with filters/pagination, update, delete, stats.
3. **Budget CRUD:** create, update, enforce uniqueness per category/month.
4. **Category CRUD:** create, list, update, delete (check cascade behavior).
5. **Goal CRUD:** create, update progress, delete.
6. **Edge cases:** expired codes, max attempts, invalid tokens, 404s, unauthorized access.

### 4.3 Frontend — expand test coverage

Current tests: only `api-client.test.ts` and `formatCurrency.test.ts`.

Priority:
1. **Services:** Test each service's mock and real paths (transactions, auth, budgets, goals).
2. **Context providers:** Test `AppContext` reducer (dispatch actions, check state).
3. **Hooks:** Test `useCurrency`, `useTranslation`.
4. **Components:** Test key form components (transaction form, auth form).

### 4.4 Add pre-commit hooks

Install `husky` + `lint-staged`:
```sh
cd frontend && npx husky init
```
Configure `lint-staged` in `package.json`:
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "tsc-files --noEmit"]
}
```

For backend, add a pre-commit hook that runs:
```sh
cd backend && ruff check --fix app && ruff format app
```

---

## Phase 5: Documentation

### 5.1 Backend docstrings

Add docstrings to every public function and class. Priority files:

- **`services/stats.py` — `get_monthly_stats()`:** Document the return dict structure, calculation methods, and date handling.
- **`services/auth.py`:** Document `_fetch_apple_public_keys()` cache logic, `verify_apple_id_token()` flow.
- **`routers/auth.py`:** Document `_seed_categories()`, `_build_auth_response()`, each endpoint's purpose.
- **All router endpoints:** Add `summary` and `description` params to FastAPI decorators so they appear in Swagger docs.

### 5.2 Frontend JSDoc comments

Add JSDoc to:
- **`context/AppContext.tsx`:** Document each of the 26 action types in the `Action` union.
- **`context/AppContext.tsx` — `AppProvider`:** Document what it provides and how to use it.
- **`services/api-client.ts` — `request()`:** Document parameters, return type, error behavior.
- **All custom hooks:** Document params, return value, and usage example.

### 5.3 Create API reference doc

Create `docs/api-reference.md` with:
- Every endpoint (method, path, auth required, request body, response shape, error codes).
- Rate limiting rules per endpoint.
- Authentication flow diagram (signup → code → verify → JWT).

You can generate a starting point from the Swagger JSON at `http://localhost:8000/openapi.json`.

### 5.4 Create environment variables reference

Create `docs/env-vars.md` listing every env var:

| Variable | Used by | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | backend | yes | `postgresql+asyncpg://...` | Postgres connection string |
| `JWT_SECRET` | backend | yes (Docker) | none | JWT signing secret |
| `SMTP_HOST` | backend | no | empty | SMTP server for emails |
| `SMTP_PORT` | backend | no | empty | SMTP port |
| `SMTP_USER` | backend | no | empty | SMTP username |
| `SMTP_PASSWORD` | backend | no | empty | SMTP password |
| `GOOGLE_CLIENT_ID` | backend | no | empty | Google OAuth client ID |
| `APPLE_CLIENT_ID` | backend | no | empty | Apple OAuth client ID |
| `EXPO_PUBLIC_API_URL` | frontend | no | mock mode | Backend API URL |
| `EXPO_PUBLIC_USE_MOCK` | frontend | no | `true` | Use mock data |

### 5.5 Create database schema doc

Create `docs/database-schema.md` with:
- ER diagram (can be ASCII or Mermaid).
- Table descriptions: columns, types, constraints, relationships.
- Notes on the "no migrations" approach and how to handle schema changes.

### 5.6 Update README.md

Add or expand:
- **Architecture overview** section (link to CLAUDE.md for details).
- **Contributing** section (lint, test, commit conventions).
- **Deployment** section (Docker, Vercel, Supabase).

---

## Phase 6: Infrastructure & DevEx

### 6.1 Docker Compose improvements

- **Add resource limits:** `deploy.resources.limits` for each service (e.g. `memory: 512M`).
- **Add logging config:** `logging.driver: json-file` with `max-size` and `max-file`.
- **Add `.env.example`** at project root with all required env vars (no real values).

### 6.2 Add `Makefile` or scripts

Create convenience commands:

```makefile
dev:           docker compose up --build
backend:       docker compose up db app
frontend:      cd frontend && npx expo start --web
lint:          cd backend && ruff check app && cd ../frontend && npm run lint
test:          cd backend && pytest && cd ../frontend && npm test
format:        cd backend && ruff format app
```

### 6.3 Backend dev tooling

Add to `requirements.txt` (or `requirements-dev.txt`):
- `pytest`, `pytest-asyncio`, `httpx` — testing
- `mypy` — type checking
- `ruff` — already used for lint/format

---

## Checklist Summary

Use this to track progress:

- [ ] **Phase 1:** Critical Fixes
  - [ ] 1.1 Fix `_INSECURE_JWT_SECRET`
  - [ ] 1.2 Pin dependency versions
  - [ ] 1.3 Add error boundaries
- [ ] **Phase 2:** Backend Cleanup
  - [ ] 2.1 Extract `get_or_404()` helper
  - [ ] 2.2 Consolidate `_to_response()` functions
  - [ ] 2.3 Move hardcoded constants to config
  - [ ] 2.4 Split auth router
  - [ ] 2.5 Split `verify_apple_id_token()`
  - [ ] 2.6 Split `get_monthly_stats()`
  - [ ] 2.7 Standardize error handling
  - [ ] 2.8 Add missing schema validations
  - [ ] 2.9 Fix category–transaction FK relationship
  - [ ] 2.10 Replace in-memory token blocklist
- [ ] **Phase 3:** Frontend Cleanup
  - [ ] 3.1 Fix `any` types + create error utility
  - [ ] 3.2 Split large components
  - [ ] 3.3 Deduplicate error extraction
  - [ ] 3.4 Deduplicate mock delay
  - [ ] 3.5 Simplify API client URL handling
  - [ ] 3.6 Add `typecheck` script
  - [ ] 3.7 Clean up unused methods
- [ ] **Phase 4:** Testing
  - [ ] 4.1 Backend pytest setup
  - [ ] 4.2 Backend test suite
  - [ ] 4.3 Frontend test expansion
  - [ ] 4.4 Pre-commit hooks
- [ ] **Phase 5:** Documentation
  - [ ] 5.1 Backend docstrings
  - [ ] 5.2 Frontend JSDoc
  - [ ] 5.3 API reference doc
  - [ ] 5.4 Env vars reference
  - [ ] 5.5 Database schema doc
  - [ ] 5.6 Update README
- [ ] **Phase 6:** Infrastructure
  - [ ] 6.1 Docker Compose improvements
  - [ ] 6.2 Add Makefile
  - [ ] 6.3 Backend dev tooling
