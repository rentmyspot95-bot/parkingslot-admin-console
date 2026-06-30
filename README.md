# ParkingSlot — Admin Console

Internal platform-operations console for the ParkingSlot marketplace. A React + TypeScript SPA over the admin-scoped API (`/api/v1/admin/**`) on the same backend the mobile app uses. See [`ParkingSlot_Admin_Console_Design_Doc.md`](./ParkingSlot_Admin_Console_Design_Doc.md) for the full design.

## Stack

- **Vite** + **React 18** + **TypeScript (strict)**
- **react-router-dom** for routing, **TanStack Query** for server state, **TanStack Table** for data grids
- **Tailwind CSS** with a small in-house UI kit (`src/shared/ui`)
- **Zustand** for session/UI state, **Recharts** for dashboard charts, **date-fns** for dates
- **Vitest** + Testing Library for tests

## Getting started

```bash
npm install
cp .env.example .env   # adjust VITE_API_* as needed
npm run dev            # http://localhost:5273
```

In dev, API calls to `/api/**` are proxied to `VITE_API_PROXY_TARGET` (see `vite.config.ts`) to avoid CORS. Set `VITE_API_BASE_URL` to the absolute admin API origin in production.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | `tsc` only |
| `npm test` | Run unit tests |

## Deployment

Containerised static SPA — see [DEPLOY.md](./DEPLOY.md) for Railway steps. Deploy
it two ways: as a **backendless demo** (`VITE_USE_MOCK=true` → serves in-memory
fixtures, login `admin@parkingslot.com` / `admin`) or against a **real admin API**
(`VITE_API_BASE_URL`). Key gotcha: `VITE_*` vars are inlined at **build** time, so
changing one requires a redeploy, not just a restart.

## Architecture

Feature-sliced layout:

```
src/
  app/         # router, providers, layout shell, nav, route guards
  shared/      # api client, auth/RBAC, ui kit, hooks, lib, types
  features/    # one folder per module (dashboard, users, hosts, …)
```

- **Auth & RBAC** — `src/shared/auth`. Access token in memory; refresh via httpOnly cookie. The SPA mirrors the server's permission map to hide controls (`useCan`), but the **server remains the security boundary** and re-checks every endpoint.
- **API client** — `src/shared/api/client.ts`. Injects the bearer token, performs single-flight 401 refresh + replay, unwraps the `{ data }` envelope, and attaches an `Idempotency-Key` to money mutations (`idempotent: true`).
- **Money** is transmitted in paise (minor units); render with `formatMoney`, send with `rupeesToPaise`.
- **Audit-first** — every state-changing action goes through a `ConfirmDialog` with a typed reason where the design doc requires one; the reason is persisted server-side to the audit log.

## Modules

Dashboard · Users · Hosts & KYC · Listings · Bookings · Booking Requests (owner-approval) · Reviews · Payments · Refunds · Payouts · Wallet/Credits · Support · Notifications · Configuration · Feature Flags · Admin Users & Roles · Audit Log.

Navigation items and routes render only if the admin holds the required permission (`src/app/nav.ts`, `src/app/guards.tsx`).
