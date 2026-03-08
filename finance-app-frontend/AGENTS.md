# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

FinTrack is a React Native / Expo personal finance app (frontend only). It runs entirely with mock data by default (`USE_MOCK = true` in `services/api-client.ts`), so no backend or database is needed.

### Running the app

- **Web mode** (recommended for Cloud agents): `npx expo start --web` — serves on `http://localhost:8081`
- Standard scripts are in `package.json`: `npm start`, `npm run web`, `npm run lint`
- Tests: `npm test` (runs Jest). Test files live in `__tests__/`.

### Lint

- `npm run lint` (runs `expo lint`). Pre-existing warnings and 1 error in `verify-code.tsx` (unescaped entity) are part of the codebase.

### Auth flow in mock mode

The mock auth accepts any email/password and any 6-digit verification code. After verification, you land on the Dashboard with pre-populated mock transactions.

### Gotchas

- The Expo Metro bundler initial bundle takes ~15 seconds. Wait for the bundle to complete before navigating.
- `"shadow*" style props are deprecated` warnings in the terminal are cosmetic and do not affect functionality.
- A FastAPI backend exists in `../finance-app-backend/`. See root `AGENTS.md` for backend instructions.
