.PHONY: dev backend frontend lint test format

# Start all services (full stack)
dev:
	docker compose up --build

# Start backend + DB only
backend:
	docker compose up db app

# Start frontend dev server (web)
frontend:
	cd frontend && npx expo start --web

# Lint backend (ruff) and frontend (eslint via expo lint)
lint:
	cd backend && ruff check app
	cd frontend && npm run lint

# Run all tests — backend (pytest) and frontend (jest)
test:
	cd backend && . venv/bin/activate && pytest
	cd frontend && npm test

# Format backend source with ruff
format:
	cd backend && ruff format app
