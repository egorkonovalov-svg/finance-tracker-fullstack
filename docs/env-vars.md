# Environment Variables Reference

This document lists all environment variables used by the Finance Tracker application.

## Core Settings

| Variable | Used by | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `DATABASE_URL` | backend | yes (Docker) | `postgresql+asyncpg://...` | PostgreSQL connection string. Docker Compose builds this from `POSTGRES_*` vars. |
| `POSTGRES_USER` | backend, Docker | no | `postgres` | PostgreSQL database username |
| `POSTGRES_PASSWORD` | backend, Docker | no | `postgres` | PostgreSQL database password |
| `POSTGRES_DB` | backend, Docker | no | `fintrack` | PostgreSQL database name |
| `JWT_SECRET` | backend | yes (Docker) | none | JWT signing secret. **Must be set** when running via Docker. |
| `JWT_ALGORITHM` | backend | no | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | backend | no | `60` | JWT access token expiration time in minutes |
| `ENVIRONMENT` | backend | no | `local` | Application environment: `local`, `dev`, `staging`, or `production` |
| `CORS_ORIGINS` | backend | no | `["http://localhost:8081", "http://localhost:8080"]` | JSON array of allowed CORS origins |
| `EXPO_PUBLIC_API_URL` | frontend | no | `http://localhost:8000/api/v1` | Backend API base URL for the frontend |
| `EXPO_PUBLIC_USE_MOCK` | frontend | no | `true` | When `true`, frontend uses mock data instead of calling the API |

## Optional Features

### SMTP Email Settings

| Variable | Used by | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `SMTP_HOST` | backend | no | empty | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | backend | no | empty | SMTP server port (e.g., `587`) |
| `SMTP_USER` | backend | no | empty | SMTP authentication username |
| `SMTP_PASSWORD` | backend | no | empty | SMTP authentication password/app password |
| `SMTP_FROM_EMAIL` | backend | no | empty | Default "from" email address |

### OAuth Providers

| Variable | Used by | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | backend | no | empty | Google OAuth client ID for Google Sign-In |
| `APPLE_CLIENT_ID` | backend | no | empty | Apple Sign-In client ID (Bundle ID) |

## Developer Settings

| Variable | Used by | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `IS_DROP_TABLES` | backend | no | `false` | **DANGER**: When `true`, drops all database tables on startup. Only for development. |
| `SQL_ECHO` | backend | no | `false` | When `true`, enables SQLAlchemy query logging to console |
| `VERIFICATION_CODE_EXPIRE_MINUTES` | backend | no | `10` | Email verification code expiration time in minutes |
| `MAX_CODE_RESENDS` | backend | no | `3` | Maximum number of times a verification code can be resent |
| `MAX_VERIFICATION_ATTEMPTS` | backend | no | `5` | Maximum failed verification attempts before rate limiting |
| `DEFAULT_CATEGORY_COLOR` | backend | no | `#6B7280` | Default hex color for new categories |
| `DEV_ADMIN_KEY` | backend | no | empty | Secret key for accessing development/admin endpoints in `routers/dev.py` |

## Test Environment

| Variable | Used by | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `TEST_DATABASE_URL` | backend (tests) | no | `postgresql+asyncpg://localhost/fintrack_test` | Separate database for running tests |

## Docker Compose Environment

When running with Docker Compose, the following additional variables are used:

- All `POSTGRES_*` variables are passed to the `db` service
- All backend variables above are passed to the `app` service
- `CI=1` is set for the frontend build (hardcoded in docker-compose.yml)

## Frontend Runtime Variables

The frontend also uses these runtime environment variables (set by Expo):

| Variable | Description |
|----------|-------------|
| `EXPO_OS` | Runtime detection of the target platform (`ios`, `android`, `web`) |

## Quick Start

### Local Development (without Docker)

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Edit .env and set:
# - DATABASE_URL to use your local macOS username
# - JWT_SECRET to a random string

# 3. Start services separately
docker compose up db          # Just the database
# In another terminal:
cd backend && uvicorn app.main:app --reload
cd frontend && npx expo start --web
```

### Docker Development

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Edit .env and set:
# - JWT_SECRET (required - no default in Docker)
# - All optional SMTP/OAuth vars as needed

# 3. Start all services
docker compose up --build
```

## Security Notes

- **Never commit `.env` files to version control**
- `JWT_SECRET` should be cryptographically random (32+ bytes)
- For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- `IS_DROP_TABLES=true` will delete all data - only use in isolated dev environments
