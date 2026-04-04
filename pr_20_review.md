# PR #20 Review — Refactor/clean up code and docs

**Branch:** `refactor/clean-up-code-and-docs` → `main`
**Files changed:** 30 | **Additions:** +7,207 | **Deletions:** -1,265

---

## Summary

This is a substantial refactoring PR. It introduces a domain exception hierarchy,
extracts business logic from routers into services, migrates transactions from
string-based category names to FK-based `category_id`, and adds a test scaffold.
Most changes are clean and well-reasoned. Several bugs and rough edges need
attention before merge.

---

## Critical Bugs

### 1. `AttributeError` on `/dev/reset-db` — `DEV_ADMIN_KEY` removed from `Settings`

**File:** `backend/app/routers/dev.py:33`
**Severity:** Critical (runtime crash)

`config.py` removed `DEV_ADMIN_KEY: str = ""` from the `Settings` class in this PR,
but `dev.py` still reads it on every call to `POST /dev/reset-db`:

```python
# dev.py:33 — will raise AttributeError at runtime
if not settings.DEV_ADMIN_KEY or x_dev_admin_key != settings.DEV_ADMIN_KEY:
```

`pydantic-settings` will raise `AttributeError: type object 'Settings' has no attribute 'DEV_ADMIN_KEY'`
the moment this branch is reached in a local environment.

**Fix:** Re-add `DEV_ADMIN_KEY: str = ""` to `Settings`, or replace the guard with a
different mechanism (e.g. require `ENVIRONMENT=local` only, no secret check):

```python
# Option A — restore the field in config.py
DEV_ADMIN_KEY: str = ""
```

---

### 2. Spurious / wrong packages in `requirements.txt`

**File:** `backend/requirements.txt`
**Severity:** Critical (supply-chain / correctness)

The `requirements.txt` was replaced with a `pip freeze` dump. This accidentally
included several packages that should not be in production dependencies:

| Package | Problem |
|---------|---------|
| `annotated-doc==0.0.4` | Different package from `annotated-types` (also present). Likely captured from a dev tool's transitive dep. |
| `fastar==0.8.0` | Internal to `ruff`'s Rust bindings; should only appear in dev deps. |
| `rignore==0.7.6` | Same — part of `ruff`'s toolchain. |
| `fastapi-cloud-cli==0.0.24` | Not a standard package; should not be in production. |
| `sentry-sdk==2.55.0` | Added but never imported or configured anywhere in the codebase — dead dependency. |
| `psycopg2-binary==2.9.11` | Project uses `asyncpg`, not `psycopg2`. Unnecessary sync driver. |

**Fix:** Regenerate `requirements.txt` from a clean production venv (without ruff/mypy
installed). Remove `sentry-sdk` unless Sentry is actually wired up. Remove `psycopg2-binary`.

---

### 3. Test isolation — committed data is not rolled back between tests

**File:** `backend/tests/conftest.py:42-47`
**Severity:** Critical (flaky tests / ordering-dependent failures)

The `db` fixture calls `await session.rollback()` after each test, but the
`test_user` fixture commits within the same session:

```python
# conftest.py:59 — commit inside test_user
await db.commit()

# conftest.py:46 — rollback in db fixture teardown
await session.rollback()  # BUG: too late, data is already committed
```

SQLAlchemy's `rollback()` cannot undo a `COMMIT`. Committed rows will persist
across tests in the same session-scoped schema, causing order-dependent failures.

**Fix:** Use a nested transaction (savepoint) pattern so the inner `commit` flushes
to the savepoint without touching the outer transaction:

```python
@pytest.fixture
async def db() -> AsyncSession:
    async with TestSessionLocal() as session:
        async with session.begin():          # outer transaction
            nested = await session.begin_nested()  # savepoint
            yield session
            await nested.rollback()          # rolls back even committed data
```

---

## Moderate Issues

### 4. `create_tables` fixture uses `asyncio.run()` — incompatible event loop

**File:** `backend/tests/conftest.py:27-35`
**Severity:** Moderate (test setup failure in some environments)

The `create_tables` fixture is a sync function that calls `asyncio.run()` to set up
the DB schema. With `pytest-asyncio==0.24` and `asyncio_mode=auto`, `asyncio.run()`
creates a second event loop separate from the one pytest-asyncio manages. This works
now but will break in environments that enforce a single event loop, and will break if
the DB engine uses a connection pool (NullPool is used, which is why it currently
works).

**Fix:** Make the fixture async and add `loop_scope="session"`:

```python
@pytest.fixture(scope="session")
async def create_tables():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

Then add to `pytest.ini`:
```ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = session
testpaths = tests
```

---

### 5. `verify_google_id_token` not refactored to use `_find_matching_key`

**File:** `backend/app/services/auth.py` (Google verification section)
**Severity:** Moderate (inconsistency / maintenance risk)

`verify_apple_id_token` was refactored to use `_find_matching_key` helper:

```python
matching_key = _find_matching_key(keys_data, kid)
```

But `verify_google_id_token` still uses an inline for-loop:

```python
matching_key = None
for key_data in keys_data.get("keys", []):
    if key_data.get("kid") == kid:
        matching_key = key_data
        break
if not matching_key:
    raise AuthenticationError("Google ID token signed with unknown key")
```

The helper exists precisely for this purpose. Not using it creates two diverging
implementations of the same pattern.

**Fix:** Replace the for-loop in `verify_google_id_token` with:
```python
matching_key = _find_matching_key(keys_data, kid)
```

---

### 6. `login` endpoint still raises raw `HTTPException` instead of domain exceptions

**File:** `backend/app/routers/auth.py:101-135`
**Severity:** Moderate (inconsistency — partially-migrated code)

The PR migrates the rest of the auth router to use `AuthenticationError` /
`AuthorizationError`, but the `login` handler body still raises `HTTPException`:

```python
# login handler — not migrated
raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified...")
```

This means login errors bypass the centralised exception handler that was set up in
`main.py`, even though the HTTP status codes produced are the same.

**Fix:** Replace the two `HTTPException` raises in `login` with:
```python
raise AuthenticationError("Invalid credentials")
raise AuthorizationError("Email not verified. Please complete sign-up first.")
```

---

### 7. `_validate_category` accepts `str` but compares against a UUID column unsafely

**File:** `backend/app/routers/transactions.py:97-112`
**Severity:** Moderate (type-unsafety / silent failure risk)

```python
async def _validate_category(db: AsyncSession, category_id: str, user_id: UUID) -> None:
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,   # Category.id is UUID, category_id is str
            ...
        )
    )
```

`Category.id` is a `UUID` column. Comparing it directly to a raw `str` relies on
SQLAlchemy / asyncpg implicit casting. If the caller passes a malformed UUID string
(e.g. missing hyphens), asyncpg will raise a low-level `InvalidTextRepresentation`
exception that bubbles up as a 500 rather than a clean 422/404.

**Fix:** Parse the UUID explicitly before the query:
```python
async def _validate_category(db: AsyncSession, category_id: str, user_id: UUID) -> None:
    try:
        cat_uuid = UUID(category_id)
    except ValueError:
        raise NotFoundError("Category not found")
    result = await db.execute(
        select(Category).where(
            Category.id == cat_uuid,
            Category.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundError("Category not found")
```

---

## Minor Issues / Code Smell

### 8. Breaking API change — `category` → `category_id` in transaction endpoints

**Files:** `backend/app/schemas/transaction.py`, `backend/app/routers/transactions.py`
**Severity:** Minor (noted, not a bug in the backend itself)

`TransactionCreate` and `TransactionUpdate` changed `category: str` to `category_id: str`.
`TransactionResponse` now exposes **both** `category_id` and `category`. This is a breaking
change for the frontend, which currently sends `{ "category": "Еда и напитки" }` for new
transactions. The frontend's `services/transactions.ts` and mock data will need to be
updated in a follow-up PR.

---

### 9. `EmailDeliveryError` global handler returns 500 — semantics worth reviewing

**File:** `backend/app/main.py:81-84`
**Severity:** Minor

```python
@app.exception_handler(EmailDeliveryError)
async def email_delivery_error_handler(request: Request, exc: EmailDeliveryError):
    return JSONResponse(status_code=500, content={"detail": exc.detail})
```

`EmailDeliveryError` is already caught and swallowed at every call site in the auth
router (`logger.warning`). This global handler should never fire, but if it does, 500
("Internal Server Error") is the correct code for an undeliverable email — the request
itself was valid. Consider 503 ("Service Unavailable") if you want to distinguish this
from other 5xx errors, but 500 is defensible. At minimum, add a comment explaining why
this handler exists alongside the call-site catches.

---

### 10. `README.md` removes env vars that are still active settings

**File:** `README.md:37-53`
**Severity:** Minor (docs gap)

`SMTP_FROM_EMAIL` and `VERIFICATION_CODE_EXPIRE_MINUTES` were removed from the example
`.env` block but both remain valid settings in `config.py`. A developer following the
README to configure a new environment will not know these exist.

**Fix:** Re-add these to the `README.md` example block, or add a note pointing to
`backend/app/config.py` for the full list.

---

### 11. `.husky/pre-commit` only covers frontend

**File:** `.husky/pre-commit`
**Severity:** Minor

```sh
cd frontend && npx lint-staged
```

Backend Python changes can be committed without `ruff check` or `mypy` running. Given
that `mypy.ini` and `ruff` were added specifically in this PR, it's inconsistent.

**Suggested addition:**
```sh
cd backend && source venv/bin/activate && ruff check app
cd frontend && npx lint-staged
```

---

### 12. `search` query max length silently increased without comment

**File:** `backend/app/routers/transactions.py:150`

```python
# Before
search: str | None = Query(default=None, max_length=100),
# After
search: str | None = Query(default=None, max_length=200),
```

No comment or PR note explains why. If intentional, add a comment.

---

## Unchanged but Noted

- **No Alembic migration for `category_id` FK**: The `Transaction` model drops the
  `category VARCHAR(100)` column and adds `category_id UUID FK`. With `IS_DROP_TABLES=False`
  (the default), existing deployments will crash on startup because the column doesn't exist.
  A DB rebuild is required. This is consistent with the project's stated approach
  ("no Alembic in active use"), but operators must be warned.

- **`docs/api-reference.md`** (918 lines): The new API reference doc is thorough and
  accurate to the current codebase. No issues found.

- **`backend/app/services/stats.py`** refactor into private helpers: clean,
  well-structured, no bugs found.

- **`backend/app/utils.py` — `get_or_404`**: Well-implemented. The `model` parameter
  should ideally be typed as `Type[T]` with a return of `T`, but the dynamic nature
  of SQLAlchemy models makes this acceptable as-is.

---

## Required Before Merge

| # | File | Issue |
|---|------|-------|
| 1 | `backend/app/routers/dev.py:33` | `AttributeError` — `DEV_ADMIN_KEY` removed from Settings |
| 2 | `backend/requirements.txt` | Spurious packages from `pip freeze` dump |
| 3 | `backend/tests/conftest.py:42-47` | Test isolation broken — rollback after commit is a no-op |

## Recommended (can be in follow-up PR)

| # | File | Issue |
|---|------|-------|
| 4 | `backend/tests/conftest.py:27-35` | `asyncio.run()` in session fixture — fragile event loop |
| 5 | `backend/app/services/auth.py` | Google JWKS lookup not using `_find_matching_key` |
| 6 | `backend/app/routers/auth.py` | `login` not migrated to domain exceptions |
| 7 | `backend/app/routers/transactions.py:97` | UUID string not validated before DB query |
