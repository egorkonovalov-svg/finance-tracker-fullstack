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