# Resolve PR #19 Merge Conflicts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `refactor/clean-up-code-and-docs` (PR #19) into `main` by resolving 6 content conflicts that arose from diverging changes to the token blocklist implementation and router refactors.

**Architecture:** Main introduced a JTI-based `RevokedToken` model with proper JWKS verification for Google Sign-In; our branch replaced the same in-memory blocklist with a `BlockedToken` model (full-token storage) and refactored routers to use custom exceptions + helper utilities. The resolution preserves our refactoring wins (domain exceptions, `get_or_404`, `model_validate`, `seed_categories` service helpers) while adopting main's superior token design (JTI, `RevokedToken`, JWKS-verified Google tokens).

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 async, PostgreSQL, python-jose, httpx, bcrypt

---

## Conflict Summary

| File | Our branch change | Main change | Resolution |
|------|------------------|-------------|------------|
| `models/__init__.py` | imports `BlockedToken` | imports `RevokedToken` | use `RevokedToken` |
| `services/auth.py` | full-token blocklist, simple Google tokeninfo | JTI blocklist + JWKS Google verification | JTI + JWKS + keep our helpers |
| `dependencies.py` | blocklist check before decode, `AuthenticationError` | JTI check after decode, `HTTPException` | JTI after decode + `AuthenticationError` |
| `routers/auth.py` | rate-limit constants, `EmailDeliveryError`, service helpers | hardcoded rates, JTI logout, Google moved to service | rate-limit constants + JTI logout |
| `routers/categories.py` | `get_or_404`, `ConflictError`, tx-count guard | reformatted 404 raises | keep our version entirely |
| `routers/transactions.py` | `category_id` FK, `NotFoundError`, `get_or_404` | LIKE escaping, search max_length=100, page le=10000 | our FK approach + main's search hardening |

---

## File Map

- **Modify:** `backend/app/models/__init__.py` — swap `BlockedToken` for `RevokedToken`
- **Delete:** `backend/app/models/blocked_token.py` — superseded by main's `revoked_token.py`
- **Modify:** `backend/app/services/auth.py` — adopt JTI signature + JWKS Google + keep our helpers
- **Modify:** `backend/app/config.py` — update `RATE_LIMIT_VERIFY` to `"3/minute"`
- **Modify:** `backend/app/dependencies.py` — JTI check after decode + `AuthenticationError`
- **Modify:** `backend/app/routers/auth.py` — JTI-based logout + keep rate-limit constants
- **Modify:** `backend/app/routers/categories.py` — keep our version (no changes needed after rebase)
- **Modify:** `backend/app/routers/transactions.py` — add LIKE escaping + `le=10000` + keep `category_id`

---

## Task 1: Switch token model from BlockedToken → RevokedToken

`RevokedToken` (JTI-based) already exists on `main`. Our branch added `BlockedToken` (full-token). We need to drop our model file and update the `__init__.py` export.

**Files:**
- Delete: `backend/app/models/blocked_token.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Delete the BlockedToken model file**

```bash
git rm backend/app/models/blocked_token.py
```

- [ ] **Step 2: Update models/__init__.py to import RevokedToken**

Replace the `BlockedToken` import with `RevokedToken`:

```python
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.verification_code import VerificationCode
from app.models.budget import Budget
from app.models.goal import Goal
from app.models.revoked_token import RevokedToken

__all__ = [
    "User",
    "Category",
    "Transaction",
    "VerificationCode",
    "Budget",
    "Goal",
    "RevokedToken",
]
```

- [ ] **Step 3: Verify no remaining imports of BlockedToken**

```bash
grep -r "BlockedToken\|blocked_token" backend/
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/__init__.py
git commit -m "refactor: replace BlockedToken with RevokedToken (JTI-based)"
```

---

## Task 2: Update services/auth.py — JTI blocklist + JWKS Google + keep our helpers

The biggest conflict. We need to:
1. Adopt main's `RevokedToken` JTI signature for `add_token_to_blocklist` / `is_token_blocklisted`
2. Keep main's full JWKS-based `verify_google_id_token` (more secure than our simple tokeninfo)
3. Keep our `AuthenticationError` in place of `HTTPException` for `verify_apple_id_token`
4. Keep our `seed_categories`, `get_or_create_user`, `get_or_create_social_user` helpers
5. Keep `DEFAULT_CATEGORIES` moved to `app.constants` (our approach)
6. Keep `cleanup_expired_blocked_tokens` but use `RevokedToken`

**Files:**
- Modify: `backend/app/services/auth.py`

- [ ] **Step 1: Open the file and resolve the blocklist section**

In `backend/app/services/auth.py`, replace the entire blocklist section with the JTI-based version using `RevokedToken`:

```python
# ─── Token blocklist (DB-backed) ─────────────────────────────────────────────


async def add_token_to_blocklist(
    db: AsyncSession, jti: str, user_id: UUID, expires_at: datetime
) -> None:
    from app.models.revoked_token import RevokedToken

    record = RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at)
    db.add(record)
    await db.commit()


async def is_token_blocklisted(db: AsyncSession, jti: str) -> bool:
    from app.models.revoked_token import RevokedToken

    result = await db.execute(select(RevokedToken).where(RevokedToken.jti == jti))
    return result.scalar_one_or_none() is not None


async def cleanup_expired_blocked_tokens() -> None:
    from app.models.revoked_token import RevokedToken

    async with async_session() as db:
        await db.execute(
            delete(RevokedToken).where(
                RevokedToken.expires_at < datetime.now(timezone.utc)
            )
        )
        await db.commit()
```

- [ ] **Step 2: Update create_access_token to embed a jti claim**

Replace the existing `create_access_token` with the version that includes `jti`:

```python
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    jti = secrets.token_hex(16)
    payload = {"sub": user_id, "exp": expire, "jti": jti}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
```

- [ ] **Step 3: Update verify_apple_id_token — keep our AuthenticationError, add APPLE_CLIENT_ID guard**

Replace with this merged version (main's `APPLE_CLIENT_ID` guard + our `AuthenticationError` + our helper decomposition):

```python
async def verify_apple_id_token(id_token: str) -> dict:
    """Verify an Apple ID token by checking its signature against Apple's public keys."""
    if not settings.APPLE_CLIENT_ID:
        raise AuthenticationError("Apple auth not configured")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError as e:
        raise AuthenticationError("Invalid Apple ID token") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise AuthenticationError("Apple ID token missing key ID")

    keys_data = await _fetch_apple_public_keys()
    matching_key = _find_matching_key(keys_data, kid)
    public_key = jwk.construct(matching_key)
    return _validate_apple_jwt(id_token, public_key)
```

And update `_validate_apple_jwt` to use `verify_aud: True` (stricter, from main):

```python
def _validate_apple_jwt(id_token: str, public_key) -> dict:
    """Decode and validate an Apple JWT against the given public key."""
    try:
        return jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
            options={"verify_aud": True},
        )
    except JWTError as e:
        logger.warning("Apple ID token verification failed: %s", e)
        raise AuthenticationError("Invalid Apple ID token") from e
```

- [ ] **Step 4: Replace verify_google_id_token with JWKS-based implementation**

Delete the simple tokeninfo implementation and replace with main's JWKS-based version (keeping our `AuthenticationError` instead of `HTTPException`):

```python
# ─── Google Sign-In verification ──────────────────────────────────────────────

GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_google_keys_cache: dict | None = None
_google_keys_fetched_at: float = 0
_GOOGLE_KEYS_TTL = 3600


async def _fetch_google_public_keys() -> dict:
    global _google_keys_cache, _google_keys_fetched_at

    now = time.monotonic()
    if _google_keys_cache and (now - _google_keys_fetched_at) < _GOOGLE_KEYS_TTL:
        return _google_keys_cache

    async with httpx.AsyncClient() as client:
        resp = await client.get(GOOGLE_KEYS_URL, timeout=10)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AuthenticationError(
                f"Failed to fetch Google public keys: {exc.response.status_code}"
            ) from exc

    _google_keys_cache = resp.json()
    _google_keys_fetched_at = now
    return _google_keys_cache


async def verify_google_id_token(id_token: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        raise AuthenticationError("Google auth not configured")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError as e:
        raise AuthenticationError("Invalid Google ID token") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise AuthenticationError("Google ID token missing key ID")

    keys_data = await _fetch_google_public_keys()
    matching_key = None
    for key_data in keys_data.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break

    if not matching_key:
        raise AuthenticationError("Google ID token signed with unknown key")

    public_key = jwk.construct(matching_key)

    try:
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=["https://accounts.google.com", "accounts.google.com"],
        )
    except JWTError as e:
        logger.warning("Google ID token verification failed: %s", e)
        raise AuthenticationError("Invalid Google ID token") from e

    return payload
```

- [ ] **Step 5: Ensure top-level imports are correct**

The final imports block should be:

```python
import logging
import secrets
import time
import threading  # remove — no longer needed
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import httpx
from jose import jwt, jwk, JWTError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.constants import DEFAULT_CATEGORIES
from app.database import async_session
from app.exceptions import AuthenticationError, ConflictError, RateLimitError
from app.models.category import Category
from app.models.user import User
from app.models.verification_code import VerificationCode
```

Note: remove `import threading` — no longer needed; add `import time` at top level.

- [ ] **Step 6: Verify the file is importable**

```bash
cd backend && source venv/bin/activate && python -c "from app.services.auth import add_token_to_blocklist, is_token_blocklisted, verify_google_id_token, verify_apple_id_token, seed_categories, get_or_create_user, get_or_create_social_user; print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/auth.py
git commit -m "refactor: adopt JTI blocklist + JWKS Google verification in services/auth"
```

---

## Task 3: Update config.py — fix RATE_LIMIT_VERIFY to 3/minute

Main changed `verify-code` rate limit from `10/minute` to `3/minute` (stricter). Our branch exposed this as a constant `RATE_LIMIT_VERIFY`. We need to update the constant value.

**Files:**
- Modify: `backend/app/config.py`

- [ ] **Step 1: Change RATE_LIMIT_VERIFY**

Find the line:
```python
RATE_LIMIT_VERIFY = "10/minute"
```

Change to:
```python
RATE_LIMIT_VERIFY = "3/minute"
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/config.py
git commit -m "security: tighten verify-code rate limit to 3/minute"
```

---

## Task 4: Update dependencies.py — JTI check after decode + AuthenticationError

Main's approach: decode JWT first, extract `jti`, then check if JTI is blocklisted. Our approach: check blocklist before decode (impossible with JTI). We adopt main's ordering but keep `AuthenticationError`.

**Files:**
- Modify: `backend/app/dependencies.py`

- [ ] **Step 1: Write the final resolved file**

```python
from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.exceptions import AuthenticationError
from app.models.user import User
from app.services.auth import is_token_blocklisted

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        if user_id is None:
            raise AuthenticationError("Invalid token")
    except JWTError as exc:
        raise AuthenticationError("Invalid token") from exc

    if jti and await is_token_blocklisted(db, jti):
        raise AuthenticationError("Token has been revoked")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise AuthenticationError("User not found")
    return user
```

- [ ] **Step 2: Verify import works**

```bash
cd backend && source venv/bin/activate && python -c "from app.dependencies import get_current_user, get_db; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/dependencies.py
git commit -m "refactor: check JTI blocklist after JWT decode in get_current_user"
```

---

## Task 5: Update routers/auth.py — JTI logout + keep rate-limit constants

Main introduced a JTI-based logout that decodes the JWT to extract `jti` and `exp` before calling `add_token_to_blocklist`. Our branch calls the service with the raw token (now wrong signature). Also need to keep our rate-limit constants and `EmailDeliveryError` wrapping.

**Files:**
- Modify: `backend/app/routers/auth.py`

- [ ] **Step 1: Update imports to include jose and datetime**

The top of the file should include these additional imports (needed for the logout JTI extraction):

```python
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import (
    RATE_LIMIT_AUTH_DEFAULT,
    RATE_LIMIT_RESEND,
    RATE_LIMIT_VERIFY,
    settings,
)
from app.dependencies import get_current_user, get_db
from app.exceptions import EmailDeliveryError
from app.models.user import User
from app.models.verification_code import VerificationCode
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ResendCodeRequest,
    SignupRequest,
    SocialAuthRequest,
    VerificationPendingResponse,
    VerifyCodeRequest,
)
from app.services.auth import (
    add_token_to_blocklist,
    create_access_token,
    create_verification,
    get_or_create_social_user,
    get_or_create_user,
    seed_categories,
    validate_verification_code,
    verify_apple_id_token,
    verify_google_id_token,
    verify_password,
)
from app.services.email import send_verification_email
```

- [ ] **Step 2: Update the logout endpoint to use JTI**

Replace the logout endpoint with the JTI-based version:

```python
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if token:
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                await add_token_to_blocklist(db, jti, current_user.id, expires_at)
        except JWTError:
            pass
    return None
```

- [ ] **Step 3: Verify the file is importable**

```bash
cd backend && source venv/bin/activate && python -c "from app.routers.auth import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/auth.py
git commit -m "refactor: use JTI-based logout with RevokedToken"
```

---

## Task 6: Resolve routers/categories.py

Main only reformatted multi-line `raise HTTPException(...)` calls. Our branch already replaced those exact lines with `get_or_404` calls and added a transaction-count guard. There is no semantic overlap — we simply keep our version.

**Files:**
- Modify: `backend/app/routers/categories.py` (no changes needed if rebase keeps our version)

- [ ] **Step 1: Verify the file looks correct after rebase**

```bash
grep -n "get_or_404\|ConflictError\|func.count" backend/app/routers/categories.py
```

Expected output (lines may vary):
```
7:from app.exceptions import ConflictError
8:from app.models.transaction import Transaction
10:from app.utils import get_or_404
49:    category = await get_or_404(
68:    category = await get_or_404(
75:    count = (
77:            select(func.count(Transaction.id)).where(
84:        raise ConflictError(
```

If instead you see `raise HTTPException(status_code=status.HTTP_404_NOT_FOUND` in the PUT/DELETE handlers, the rebase took main's version — restore ours by checking out from HEAD:

```bash
git checkout HEAD -- backend/app/routers/categories.py
```

- [ ] **Step 2: Commit (only if file was changed)**

```bash
git add backend/app/routers/categories.py
git commit -m "fix: restore categories router with get_or_404 after rebase"
```

---

## Task 7: Resolve routers/transactions.py — keep category_id + add search hardening

Our branch replaced `category` string filter with `category_id` FK and added `NotFoundError`/`get_or_404`. Main hardened the LIKE search (SQL injection escaping), limited search to 100 chars, and added `page le=10000`. We keep our approach and apply main's hardening.

**Files:**
- Modify: `backend/app/routers/transactions.py`

- [ ] **Step 1: Apply LIKE escaping to the search subquery**

In `_apply_filters`, where the search pattern is built, apply escaping before it's used in the `Category.name.ilike()` subquery:

```python
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        q = q.where(
            Transaction.note.ilike(pattern)
            | exists(
                select(Category.id).where(
                    Category.id == Transaction.category_id,
                    Category.name.ilike(pattern),
                )
            )
        )
```

- [ ] **Step 2: Add page upper-bound in list_transactions**

In the `list_transactions` signature, update `page`:

```python
    page: int = Query(default=1, ge=1, le=10000),
```

- [ ] **Step 3: Verify the file is importable**

```bash
cd backend && source venv/bin/activate && python -c "from app.routers.transactions import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/transactions.py
git commit -m "fix: apply LIKE escaping and page bound to transactions router"
```

---

## Task 8: Full integration check

Run a quick sanity check that all modules import correctly after all changes.

**Files:** None modified — verification only.

- [ ] **Step 1: Import all affected modules**

```bash
cd backend && source venv/bin/activate && python -c "
from app.models import RevokedToken, User, Category, Transaction
from app.services.auth import (
    add_token_to_blocklist, is_token_blocklisted, cleanup_expired_blocked_tokens,
    create_access_token, verify_google_id_token, verify_apple_id_token,
    seed_categories, get_or_create_user, get_or_create_social_user,
)
from app.dependencies import get_current_user, get_db
from app.routers.auth import router as auth_router
from app.routers.categories import router as cat_router
from app.routers.transactions import router as tx_router
print('All imports OK')
"
```

Expected: `All imports OK`

- [ ] **Step 2: Verify no BlockedToken references remain**

```bash
grep -r "BlockedToken\|blocked_token" backend/
```

Expected: no output.

- [ ] **Step 3: Verify RevokedToken is referenced correctly**

```bash
grep -rn "RevokedToken\|revoked_token" backend/app/
```

Expected: references in `models/__init__.py`, `models/revoked_token.py`, `services/auth.py`.

- [ ] **Step 4: Final commit if any last-minute fixes were needed**

```bash
git add -p
git commit -m "fix: post-rebase cleanup after PR #19 conflict resolution"
```

---

## Notes for the implementer

- **Do not** run `git merge origin/main` directly on this branch — do a `git rebase origin/main` to produce a clean linear history before merging.
- After rebasing, git will stop at each conflicted file. For each, apply the resolution described in the corresponding task above, then `git add <file> && git rebase --continue`.
- The tasks above describe the _desired end state_ of each file — if the rebase auto-resolves a file correctly (no conflict markers), verify it matches expectations before moving on.
- If the rebase results in a detached HEAD or goes wrong, abort with `git rebase --abort` and start fresh.
