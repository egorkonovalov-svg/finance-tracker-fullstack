# FinTrack

A full-stack personal finance tracking application with a React Native (Expo) frontend and FastAPI backend.

## Architecture Overview

This is a monorepo containing both frontend and backend services:

- **Frontend**: Expo / React Native web app (port 8081)
- **Backend**: FastAPI / Python 3.12 API (port 8000)
- **Database**: PostgreSQL (port 5432)

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native, Expo, TypeScript |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL (asyncpg) |
| Auth | JWT with email 2FA |
| Deployment | Docker, Vercel (frontend), Supabase (DB) |

For detailed architecture documentation, see [CLAUDE.md](./CLAUDE.md).

## Environment Variables

Create a `.env` file in the project root. See [.env.example](./.env.example) for the full template.

Key variables:

```env
# Database
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/fintrack

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Frontend
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_USE_MOCK=false

# SMTP (for email verification codes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Installation & Setup

### Option A: Docker (recommended)

Ensure [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-app-backend
   ```

2. **Optional: create a `.env` file** in the project root to override defaults (e.g. `JWT_SECRET`, SMTP settings). Compose will use `DATABASE_URL` for the `db` service automatically.

3. **Build and run**
   ```bash
   docker compose up --build
   ```

   The API will be at **http://localhost:8000**. PostgreSQL runs on port 5432 (host). Docs: http://localhost:8000/docs

4. **Run in background**
   ```bash
   docker compose up -d --build
   ```

5. **Stop and remove containers**
   ```bash
   docker compose down
   ```
   Add `-v` to remove the Postgres data volume: `docker compose down -v`.

### Option B: Local setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-app-backend
   ```

2. **Create a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb fintrack
   ```

5. **Configure environment variables**
   ```bash
   cp .env.example .env  # If you have an example file
   # Edit .env with your configuration
   ```

6. **Run database migrations** (if using Alembic)
   ```bash
   alembic upgrade head
   ```

7. **Start the development server**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
# FinTrack Frontend
## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-app-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on a platform**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your device

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Start and open iOS simulator
- `npm run android` - Start and open Android emulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests (Jest)

## Contributing

### Code Style

**Frontend (TypeScript/React)**
```bash
cd frontend
npm run lint          # ESLint via expo lint
npm run lint --fix    # Auto-fix issues
```

**Backend (Python)**
```bash
cd backend
source venv/bin/activate
ruff check --fix app  # Lint and auto-fix
ruff format app       # Format code
```

### Testing

**Frontend**
```bash
cd frontend
npm test              # Run Jest tests
npm test -- --testPathPattern=<file>  # Single test file
```

**Backend**
```bash
cd backend
source venv/bin/activate
pytest               # Run pytest suite
pytest -v           # Verbose output
```

### Commit Conventions

We use conventional commit messages:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, no logic change)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Build process or auxiliary tool changes

Example: `feat: add transaction filtering by date range`

### Pre-commit Checklist

1. Run linting: `npm run lint` (frontend), `ruff check app` (backend)
2. Run tests: `npm test` (frontend), `pytest` (backend)
3. Update documentation if needed
4. Ensure commit message follows conventions

## Deployment

### Docker (Full Stack)

Deploy the entire stack with Docker Compose:

```bash
docker compose up --build           # All services
docker compose up -d --build        # Detached mode
docker compose down -v              # Stop and remove volumes
```

Services:
- Frontend: http://localhost:8081
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

### Vercel (Frontend + Serverless API)

The frontend is configured for Vercel deployment via `vercel.json`:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configuration:
- Static frontend built with `npx expo export --platform web`
- Backend runs as serverless functions via `api/index.py`
- API routes rewritten to `/api/v1/*`

### Supabase (Database)

For production PostgreSQL hosting:

1. Create a project at [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Set `DATABASE_URL` in Vercel environment variables:
   ```
   postgresql+asyncpg://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Environment-Specific Notes

**Development**
- Use `EXPO_PUBLIC_USE_MOCK=true` for frontend-only development
- PostgreSQL runs in Docker container
- Hot reload enabled for both frontend and backend

**Production**
- Set `JWT_SECRET` to a cryptographically random string
- Configure SMTP credentials for email verification
- Use `CORS_ORIGINS` to restrict allowed origins
- Database tables auto-created on first startup (no migrations needed)