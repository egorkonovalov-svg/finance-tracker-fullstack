# FinTrack frontend – Docker Compose
#
# Development (Expo dev server for web):
#   docker compose up frontend
#   Open http://localhost:8081
#
# Production-style (static web build served by nginx):
#   docker compose up frontend-web
#   Open http://localhost:8080

services:
  frontend:
    build:
      context: .
      target: dev
    ports:
      - "8081:8081"
    environment:
      - CI=1
      - EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-http://localhost:8000/api/v1}
      - EXPO_PUBLIC_USE_MOCK=${EXPO_PUBLIC_USE_MOCK:-false}
    volumes:
      # Mount source for live reload (optional; remove if you prefer rebuild on change)
      - .:/app
      - /app/node_modules
    stdin_open: true
    tty: true

  frontend-web:
    build:
      context: .
      target: web
    ports:
      - "8080:80"
    profiles:
      - web
