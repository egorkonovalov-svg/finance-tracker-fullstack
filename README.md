# FinTrack Backend API
## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/fintrack

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Environment
ENVIRONMENT=local  # Options: local, staging, production

# SMTP Configuration (for email verification codes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
VERIFICATION_CODE_EXPIRE_MINUTES=10
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