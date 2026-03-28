# Security & Code Quality Audit — `fix/security-vulnerabilities`

**Date:** 2026-03-28

---

## Backend

**[CRITICAL]** `backend/app/config.py:8,17` — Insecure JWT secret with weak default
> `JWT_SECRET` defaults to `"change-me-to-a-random-secret-in-production"`. While a `sys.exit(1)` check exists for non-local environments, the constant is still defined and could be used if the check is bypassed or misconfigured.
> Remove the default entirely. Require the env var with no fallback: `JWT_SECRET: str` (no default).

**[CRITICAL]** `backend/app/services/auth.py:21-34` — In-memory token blocklist lost on restart
> Logout tokens are stored in a `set[str]` in process memory. On server restart all revoked tokens become valid again. In multi-instance deployments, logout on one instance doesn't affect others.
> Replace with Redis or a DB-backed `revoked_tokens` table (code even has a comment saying "replace with Redis").

**[HIGH]** `backend/app/services/email.py:24` — Verification code logged in plaintext
> `logger.warning(">>> FinTrack verification code for %s: %s <<<", to, code)` logs 6-digit OTPs. If logs are shipped to an aggregator, all codes are exposed.
> Remove the log line. Use a separate test fixture for local OTP delivery, not production code.

**[HIGH]** `backend/app/routers/auth.py` — `/verify-code` rate limit too high (10/min)
> A 6-digit code has 10⁶ combinations. At 10 req/min that's 600,000 attempts/day — more than half the keyspace in one day.
> Reduce to 3/min. Add exponential backoff or account lockout after 5 consecutive failures.

**[HIGH]** `backend/app/routers/transactions.py:61-65` — Unescaped LIKE wildcards in search
> `pattern = f"%{search}%"` is passed to `.ilike()` with no max-length constraint or metacharacter escaping. `%` and `_` in user input alter query behavior; unbounded length causes regex-cost DoS.
> Add `Query(max_length=100)` and escape LIKE metacharacters: `search.replace("%","\\%").replace("_","\\_")`.

**[HIGH]** `backend/app/routers/dev.py:12-23` — DB reset endpoint accessible to any authenticated user
> In `local` environment, `POST /api/v1/dev/reset-db` requires only a valid JWT — no admin role check.
> Require a separate `DEV_ADMIN_KEY` env var checked in the route, or remove the HTTP endpoint and use a CLI script instead.

**[HIGH]** `backend/app/main.py:40-46` — CORS uses wildcard methods and headers with credentials
> `allow_methods=["*"], allow_headers=["*"], allow_credentials=True` — overly permissive. Pairing `allow_credentials=True` with broad method/header wildcards increases CSRF surface.
> Enumerate exact methods (`GET,POST,PUT,DELETE`) and required headers (`Authorization,Content-Type`).

**[MEDIUM]** `backend/app/routers/auth.py:209-234` — Social auth falls through on unknown provider
> Only `google` and `apple` are handled; there is no explicit `else` to reject unknown providers. A future provider added without handling it will set `email = None`, silently reaching the fallback path.
> Add an explicit `else: raise HTTPException(400, "Unsupported provider")`.

**[MEDIUM]** `backend/app/routers/auth.py:209-218` — Google token sent to Google tokeninfo URL
> Token is passed as a URL query parameter: `?id_token=<token>`. This leaks the token in server logs, proxy logs, and browser history.
> Verify Google ID tokens locally using PyJWT + Google's JWKS endpoint (same approach used for Apple).

**[MEDIUM]** `backend/app/services/auth.py:114-124` — Apple audience check skipped when `APPLE_CLIENT_ID` unset
> `options={"verify_aud": bool(settings.APPLE_CLIENT_ID)}` disables audience validation when the config key is empty. This allows tokens issued to other apps to be accepted.
> Make `APPLE_CLIENT_ID` required when Apple auth is enabled. Never skip `verify_aud`.

**[MEDIUM]** `backend/app/routers/transactions.py:94-95` — Unbounded page number
> `page: int = Query(ge=1)` has no upper bound. `(page-1) * page_size` is passed to `OFFSET`, so requesting page 99999999 causes a large offset scan.
> Add `le=10000` or switch to cursor-based pagination.

**[MEDIUM]** `backend/app/schemas/auth.py:6` — Password minimum length is 6 characters
> NIST SP 800-63B recommends at least 8 characters; 6 is below the modern baseline.
> Increase `min_length` to 8 (frontend also enforces `MIN_PASSWORD_LENGTH = 6`, update both).

**[MEDIUM]** `backend/app/routers/auth.py:273-278` — Logout token extraction via string split
> `token = request.headers.get("Authorization","").removeprefix("Bearer ")` silently returns an empty string if the header is malformed, adding `""` to the blocklist.
> Use `HTTPBearer()` dependency to extract and validate the token before passing it to the blocklist.

**[LOW]** `backend/app/main.py` — No security response headers
> Missing `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy`.
> Add a small Starlette middleware or use `secure` library.

**[LOW]** `backend/app/main.py:32-33` — Swagger docs gated only to `"local"` env label
> If `ENVIRONMENT` is set to any value other than `"local"` (e.g. `"dev"`, `"staging"`), docs are hidden — which is good — but the gating relies on an exact string match with no validation.
> Document the expected values; consider adding `"staging"` and `"production"` to an explicit blocklist.

---

## Frontend

**[CRITICAL]** `frontend/context/AuthContext.tsx:51` — JWT stored in unencrypted AsyncStorage
> `AsyncStorage.setItem('@fintrack_token', t)` writes the JWT to a plain JSON file on disk, readable by any process with filesystem access on a rooted/jailbroken device.
> Use `expo-secure-store` (wraps iOS Keychain / Android Keystore).

**[CRITICAL]** `frontend/app/auth.tsx:81-84` — `session_id` + email passed as navigation route params
> Route params are stored in navigation history and appear in logs/crash reporters. The `session_id` is a credential — exposing it allows code replay.
> Store in React Context memory only (never in params or AsyncStorage).

**[HIGH]** `frontend/context/AuthContext.tsx:57-75` — Stored token used without expiry check
> On app launch the token is loaded from storage and used directly with no JWT expiry check. An expired (or revoked) token will fail on the first API call rather than being cleared proactively.
> Decode with `jwt-decode` and compare `exp` to `Date.now()/1000` before restoring session.

**[HIGH]** `frontend/context/AuthContext.tsx:71` — Raw API error message surfaced to user
> `setAuthError(e instanceof Error ? e.message : ...)` forwards backend error text directly to the UI, potentially leaking implementation details.
> Display a generic message; log the raw error via a crash reporter.

**[MEDIUM]** `frontend/app/auth.tsx:95` — Hardcoded `'google-mock-token'` in source
> `socialAuth({ provider: 'google', id_token: 'google-mock-token' })` bypasses real OAuth. Acceptable in mock mode but should not ship if `USE_MOCK` can be set at runtime in production builds.
> Guard with a build-time flag (`__DEV__` or EAS build profile) so mock paths are tree-shaken from production bundles.

**[MEDIUM]** `frontend/services/api-client.ts:90-97` — API responses cast without runtime validation
> `return res.json() as Promise<T>` is an unsafe cast with no schema check. A compromised or misbehaving backend could return unexpected shapes that cause silent data corruption.
> Validate responses with Zod schemas at service boundaries.

**[MEDIUM]** `frontend/app/auth.tsx:27` — Password min length 6 (frontend)
> Matches the backend weakness; see backend finding above.

**[LOW]** `frontend/context/AuthContext.tsx:102-110` — Logout errors silently swallowed
> If the backend logout call fails, local state is still cleared — which is correct — but the error is never logged, making post-incident investigation impossible.
> Log the error to a crash/monitoring service even while continuing with local logout.

---

## Git History & Secrets

**[CRITICAL]** Git commit `a67d032` — Gmail App Password committed in `.env`
> Commit message "testing. no gitignore, merged .env file" added a `.env` containing `SMTP_PASSWORD=iyhc yrpp czzq clsx` (Google App Password) to git history. The same credential is present in `backend/.env.unneded` on disk.
> **Revoke this App Password immediately.** Remove from history with `git filter-repo --path .env --invert-paths` and force-push. Delete `backend/.env.unneded` from disk.

**[HIGH]** `backend/.env.unneded:10` — Active credential in tracked working-tree file
> File contains the same Gmail App Password. The gitignore pattern `*.unneded` (single `e`) does not match `*.unneded` consistently. Either the pattern or the filename is misspelled.
> Delete the file; fix gitignore to `*.unneeded` and `*.unneded`.

**[LOW]** `.env:8` — System username in `DATABASE_URL`
> `postgresql+asyncpg://egorkonovalov@localhost:5432/fintrack` leaks the OS username. Low risk for a local dev file, but worth noting for any future example/template usage.
> Use a generic value like `appuser` in `.env.example`.

---

## Dependency Snapshot

No critical CVEs identified in current `requirements.txt` or `package.json` versions (FastAPI, SQLAlchemy 2.x, Expo ~54, React 19). Run `pip-audit` and `npm audit` as part of CI to stay current.

---

## Summary Table

| Severity | Count |
|----------|------:|
| CRITICAL | 5 |
| HIGH | 7 |
| MEDIUM | 8 |
| LOW | 6 |
| **Total** | **26** |

---

## Top 5 Immediate Actions

1. **Revoke the Gmail App Password** (`a67d032`) and purge it from git history with `git filter-repo`.
2. **Delete** `backend/.env.unneded`.
3. **Migrate** frontend JWT storage from `AsyncStorage` → `expo-secure-store`.
4. **Move** `session_id`/email out of navigation params into React Context.
5. **Lower** `/verify-code` rate limit to 3/min and add lockout after 5 failures.
