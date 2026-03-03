# FinTrack frontend – development and production web

# ─── Stage: development (Expo dev server) ───────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

# Install dependencies first (better layer cache)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Expose Metro / Expo dev server
EXPOSE 8081

# Run dev server for web; use 'lan' so server is reachable from host (Expo only allows lan|tunnel|localhost)
ENV CI=1
ENV WDS_SOCKET_HOST=0.0.0.0
CMD ["npx", "expo", "start", "--web", "--host", "lan"]

# ─── Stage: production (static web export + nginx) ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build static web bundle (output in dist/)
RUN npx expo export --platform web

# ─── Production serve with nginx ───────────────────────────────────────────
FROM nginx:alpine AS web

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA: serve index.html for client routes
RUN echo 'server { \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  gzip on; \
  gzip_types text/plain text/css application/json application/javascript; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
