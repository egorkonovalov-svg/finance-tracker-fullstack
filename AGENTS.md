# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Full-stack personal-finance app (monorepo).

- Frontend (Expo/React Native): `finance-app-frontend/`, port 8081
- Backend (FastAPI/Python 3.12): `finance-app-backend/`, port 8000
- Database: Docker container on port 5432

The frontend can run standalone with mock data (`EXPO_PUBLIC_USE_MOCK=true`), making the backend optional for UI-only work.

### Running services

- **Frontend (web):** `npx expo start --web` from `finance-app-frontend/` (port 8081)
- **Backend:** `source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` from `finance-app-backend/`
- **Database:** Start Docker daemon with `sudo dockerd &>/tmp/dockerd.log &`, wait ~3s, then start the DB container. Credentials must match `finance-app-backend/.env` `DATABASE_URL`. See `docker-compose.yml` for reference config.

### Lint / Test / Build

- **Frontend lint:** `npm run lint` from `finance-app-frontend/`
- **Frontend tests:** `npm test` from `finance-app-frontend/`
- **Backend:** No separate lint/test commands configured; API docs at `http://localhost:8000/docs`

### Gotchas

- Docker daemon must be started manually in Cloud — wait ~3s before issuing docker commands.
- The DB container persists across restarts if not removed.
- Backend auto-creates DB tables on startup via `Base.metadata.create_all` (no Alembic migrations exist yet).
- Frontend `.env` defaults to `EXPO_PUBLIC_USE_MOCK=true`; set to `false` and ensure backend is running to use the real API.
- The backend `.env` lives at `finance-app-backend/.env`; the Python venv is at `finance-app-backend/venv/`.
