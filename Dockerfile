# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps against the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Public, build-time config. Vite inlines VITE_* at build, so these MUST be set
# during `npm run build` (Railway passes service variables as build args because
# they are declared as ARG below).
#   • Backendless DEMO: set VITE_USE_MOCK=true — the app serves itself from
#     in-memory fixtures (login admin@parkingslot.com / admin), no API needed.
#   • Real API: set VITE_USE_MOCK=false and VITE_API_BASE_URL to your absolute
#     admin API origin, e.g. https://api.parkingslot.com/api/v1/admin
ARG VITE_API_BASE_URL=/api/v1/admin
ARG VITE_ENV_NAME=production
ARG VITE_USE_MOCK=false
ARG VITE_SENTRY_DSN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ENV_NAME=$VITE_ENV_NAME \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# `serve -s` serves the SPA with history-API fallback (deep links survive refresh).
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

# `serve` binds to the PORT env var when no --listen flag is given (Railway
# injects PORT). Avoid shell var-substitution in the command so it works even
# when the runner doesn't expand ${PORT}. Defaults to 3000 for local `docker run`.
EXPOSE 3000
CMD ["serve", "-s", "dist"]
