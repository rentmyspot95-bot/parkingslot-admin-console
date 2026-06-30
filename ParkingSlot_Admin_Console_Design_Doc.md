# ParkingSlot — Admin Console Design Document
### Platform Operations Console · React + TypeScript · v1.2

> **Scope:** A web-based internal console that operates on the **same backend** as the ParkingSlot mobile app (`https://api.parkingslot.com`, prefix `/api/v1/`). This document covers architecture, data model, navigation, every functional module, screen specifications, the admin API contract, and the auth/permission model. It is written to sit alongside the existing `ParkingSlot_Flutter_Dev_Guide.md` and reuse its entities and conventions.
>
> **Changelog v1.2:** Reconciled the data model against the **actual API contract** — API/DB use `snake_case`; "owner" is a **role on a user** (`?role=seeker|owner`), not a separate account; chat threads carry `thread_type` + support `category`; reviews are one-per-completed-booking. Added **[Appendix A — Inferred Database Schema](#appendix-a--inferred-database-schema)**, reverse-engineered from the API and clearly flagged as pending confirmation against real migrations.
>
> **Changelog v1.1:** Added the **owner-approval (request-to-book) lifecycle** — booking mode on listings, expanded booking status enum with `pending_owner_approval` / `auto_rejected`, the owner response window, a dedicated **Owner-Approval Requests** module (§9.5a), the `booking.override` permission, and related config and API endpoints.

---

## Table of Contents

1. [Overview & Context](#1-overview--context)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Personas & Roles](#3-personas--roles)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Information Architecture & Navigation](#6-information-architecture--navigation)
7. [Data Model](#7-data-model)
8. [Authentication & Authorization (RBAC)](#8-authentication--authorization-rbac)
9. [Module Specifications](#9-module-specifications)
   - 9.1 Dashboard & Analytics
   - 9.2 Users (Seekers)
   - 9.3 Hosts & KYC
   - 9.4 Listings Moderation
   - 9.5 Bookings
   - 9.6 Payments & Refunds
   - 9.7 Payouts (Host Settlements)
   - 9.8 Wallet & Credits
   - 9.9 Reviews Moderation
   - 9.10 Support Console
   - 9.11 Notifications & Campaigns
   - 9.12 Configuration & Feature Flags
   - 9.13 Admin Users & Roles
   - 9.14 Audit Log
10. [Admin API Specification](#10-admin-api-specification)
11. [Design System & UI Conventions](#11-design-system--ui-conventions)
12. [Cross-Cutting Patterns](#12-cross-cutting-patterns)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Phased Delivery Plan](#14-phased-delivery-plan)
15. [Open Questions & Assumptions](#15-open-questions--assumptions)
- [Appendix A — Inferred Database Schema](#appendix-a--inferred-database-schema)

---

## 1. Overview & Context

ParkingSlot is a peer-to-peer parking marketplace. **Seekers** discover and book parking via the Flutter app; **Hosts** list and rent out their parking spaces. Money flows in from seekers (Razorpay), and out to hosts as payouts, with the platform taking commission. The mobile app already exercises a mature REST backend covering auth, listings, availability, bookings, payments, wallet credits, reviews, support chat, and push notifications.

The **Admin Console** is the operational control plane for this marketplace. It does not introduce a new backend; it adds an **admin-scoped API surface** (`/api/v1/admin/**`) over the existing data and gives the operations, finance, support, and trust-and-safety teams the tooling to run the platform day to day.

**What exists today (mobile-facing) that the console must reflect:**

| Domain | Mobile reality the console manages |
| --- | --- |
| Auth | Phone + OTP → JWT (access/refresh). Console reuses identity records, adds admin auth. |
| Listings | Host-created parking spaces with location, amenities, price, availability slots, and a **booking mode**: `instant_book` or `request_to_book`. |
| Vehicle types | Canonical `bike` / `car` (UI labels 2-Wheeler / Hatchback / Sedan). |
| Bookings | `preview → create` flow; availability pre-check per date. Request-to-book bookings enter a **pending owner-approval** state first. |
| Owner approval | Owners have a **Requests** screen (Pending / Confirmed / Done). They **approve or reject** each request (reject requires a reason), within a **response window that auto-rejects on timeout**. Earnings are shown net of commission. Instant-book listings skip this entirely. |
| Payments | Razorpay capture; the console owns refunds and reconciliation. |
| Wallet | **Credits-only** (no top-up). Console issues/adjusts credits. |
| Reviews | Seeker → listing reviews. Console moderates. |
| Support | Per-thread chat over SSE. Console is the agent side. |
| Notifications | FCM push with type-routed payloads. Console composes campaigns. |

---

## 2. Goals & Non-Goals

**Goals**

- Give Ops a single place to inspect and act on any user, host, listing, booking, payment, or support thread.
- Make money movements auditable: every refund, credit adjustment, and payout is logged with actor, reason, and timestamp.
- Enforce trust & safety: host KYC, listing approval, review moderation, account suspension.
- Be safe by construction: role-based permissions, confirmation on destructive/irreversible actions, full audit trail.
- Reuse the existing backend and domain model — no parallel source of truth.

**Non-Goals (v1)**

- No host-facing self-service dashboard (hosts continue to use the mobile app). The console is internal-only.
- No bespoke BI/data-warehouse layer; analytics in v1 are operational aggregates from the transactional API.
- No direct database access from the UI — everything goes through the admin API.
- No marketing CMS beyond push campaigns and config-driven banners.

---

## 3. Personas & Roles

| Role | Primary jobs | Representative permissions |
| --- | --- | --- |
| **Super Admin** | Platform owner; manage admins, roles, config, feature flags. | All permissions, including `admin.manage`, `config.write`. |
| **Operations** | Day-to-day: users, hosts, listings, bookings. | `user.*`, `host.*`, `listing.*`, `booking.read/cancel`. |
| **Finance** | Payments, refunds, payouts, wallet credits, reconciliation. | `payment.*`, `payout.*`, `wallet.adjust`, `booking.read`. |
| **Trust & Safety** | KYC review, listing approval, review moderation, suspensions. | `host.verify`, `listing.approve`, `review.moderate`, `user.suspend`. |
| **Support Agent** | Handle support threads, look up bookings, issue goodwill credits within a cap. | `support.*`, `booking.read`, `wallet.adjust:capped`, `user.read`. |
| **Analyst (read-only)** | Dashboards and exports, no mutations. | `*.read`, `export.run`. |

Roles are collections of fine-grained permissions (Section 8). A given admin may hold multiple roles; the effective permission set is the union.

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Admin Console (SPA)                        │
│   React + TypeScript · Vite · TanStack Router/Query · Tailwind     │
│   Runs at admin.parkingslot.com (internal, behind SSO/VPN)         │
└───────────────┬──────────────────────────────────────────────────┘
                │  HTTPS, Bearer <admin JWT>
                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Admin API  /api/v1/admin/**                     │
│   • Same gateway as mobile, separate route group + middleware      │
│   • Admin auth (email+password+TOTP), short-lived JWT, RBAC guard  │
│   • Every mutation emits an AuditLog entry                         │
└───────────────┬──────────────────────────────────────────────────┘
                │   reuses existing services
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  Existing domain services: Users · Listings · Bookings · Payments  │
│  (Razorpay) · Wallet · Reviews · Support(SSE) · Notifications(FCM) │
│  Primary store (Postgres) · Object storage (media) · Redis (cache) │
└──────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions**

- **Separate route group, shared services.** Admin endpoints live under `/api/v1/admin/` with their own auth middleware and RBAC guard, but call the same service layer the mobile API uses. This prevents data drift and avoids a second backend.
- **Admin identity is distinct from app identity.** App users authenticate with phone+OTP; admins authenticate with email + password + TOTP. An admin is never a mobile `User` record; they are an `AdminUser`.
- **Server-enforced permissions.** The SPA hides controls the admin can't use, but every admin endpoint independently checks permissions. The UI is a convenience, not the security boundary.
- **Audit-first mutations.** Any state-changing admin call writes an `AuditLog` row (actor, action, target, before/after where feasible, reason). Reads are not audited except for sensitive PII exports.
- **Idempotency on money actions.** Refunds, credit adjustments, and payout triggers accept an `Idempotency-Key` header to prevent double-execution on retry.

---

## 5. Technology Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript (strict) | Shared DTO types generated from the admin OpenAPI spec. |
| Build | Vite | Fast HMR; environment via `.env`. |
| Routing | TanStack Router (or React Router v6) | Type-safe routes, nested layouts per module. |
| Server state | TanStack Query | Caching, pagination, optimistic updates, retries. |
| Client state | Zustand (lightweight) | Only for UI/session state; server data stays in Query. |
| Forms | React Hook Form + Zod | Zod schemas double as runtime validation and TS types. |
| UI components | Tailwind + shadcn/ui (Radix primitives) | Accessible, themeable; matches a desktop-dense console. |
| Tables | TanStack Table | Sorting, column filtering, server-side pagination, row selection for bulk actions. |
| Charts | Recharts | Dashboard aggregates. |
| Dates | date-fns + IANA tz | Display in admin's locale; store/transmit ISO-8601 UTC. |
| Auth | OIDC/SSO (recommended) or in-house admin login + TOTP | Token in memory + httpOnly refresh cookie. |
| HTTP | Fetch wrapper / Axios with interceptors | Attaches bearer, handles 401 refresh, injects idempotency keys. |
| Testing | Vitest + Testing Library + Playwright (E2E) | RBAC and money flows get E2E coverage. |
| Observability | Sentry (front end) | Correlate with backend request IDs. |

**Project layout (feature-sliced):**

```
src/
  app/            # router, providers, layout shells
  shared/         # api client, ui kit, hooks, types (generated)
  features/
    dashboard/
    users/
    hosts/
    listings/
    bookings/
    payments/
    payouts/
    wallet/
    reviews/
    support/
    notifications/
    config/
    admins/
    audit/
```

---

## 6. Information Architecture & Navigation

Left sidebar, grouped. Items render only if the admin holds at least one required permission.

```
Dashboard
─ Marketplace
   Users
   Hosts
   Listings
   Bookings
   Booking Requests
   Reviews
─ Finance
   Payments
   Refunds
   Payouts
   Wallet / Credits
─ Engagement
   Support
   Notifications
─ Platform
   Configuration
   Feature Flags
   Admin Users & Roles
   Audit Log
```

**Global chrome:** top bar with global search (jump to user / host / listing / booking by id, phone, or email), environment badge (prod/staging), admin avatar + role, and a notification bell for queue counts (pending KYC, flagged reviews, open support threads).

---

## 7. Data Model

Entities the console reads/writes. Fields shown are the admin-relevant subset; the mobile app already defines the seeker-facing shapes.

> **Source-of-truth note.** Field names below are written in `camelCase` for readability, but the **live API and database use `snake_case`** (`booking_id`, `listing_id`, `parking_type`, `availability_status`, `thread_type`, `ticket_ref`, …). Map accordingly. The concrete table layout is reverse-engineered in [Appendix A](#appendix-a--inferred-database-schema), which is the section to confirm against your actual migrations.
>
> **Owner vs. Seeker is a role, not a separate account.** The live API addresses the same person as `?role=seeker|owner` (e.g. `GET /chats/threads?role=owner`). A user is a **seeker by default and becomes an owner** once they list a space. So "Host" in this document is a **role + owner profile on a user**, most likely a `users` row plus an `owner_profiles` row — *not* a second account type. The admin "Hosts" module operates on users who hold the owner role.

**User (Seeker)**
```
id, phone, name, email?, status (active|suspended|deleted),
vehicles[] {type: bike|car, label, plate?}, walletCreditBalance,
createdAt, lastActiveAt, bookingCount, flagged: bool
```

**Host**
```
id, userId, displayName, kycStatus (unverified|pending|verified|rejected),
kycDocs[] {type, url, reviewedBy?, reviewedAt?}, payoutAccount {upi?|bank?},
listingCount, rating, totalEarnings, status (active|suspended), createdAt
```

**Listing**
```
id, hostId, title, address, geo {lat,lng}, photos[], amenities[],
vehicleTypes[] (bike|car), pricePerHour, pricePerDay?,
bookingMode (instant_book|request_to_book),   // instant_book skips owner approval
availabilityRules, status (draft|pending_review|active|paused|rejected),
moderationNote?, activeFilters (amenity count), createdAt, updatedAt
```

**Booking**
```
id, listingId, seekerId, hostId, slot {start,end}, vehicleType, bayId?,
amount, currency, commission, netToHost,
status (requested|pending_owner_approval|confirmed|active|completed
        |rejected|auto_rejected|expired|cancelled|disputed),
// Owner-approval (request_to_book listings only):
ownerDecision? (approved|rejected), ownerRejectReason?,
responseDeadline?,        // owner must act before this; else auto_rejected
decidedAt?, autoRejected: bool,
paymentId, createdAt, cancelledBy?, cancelReason?
```

> **Booking lifecycle by mode.** *Instant-book:* `preview → create → confirmed`. *Request-to-book:* `preview → create → pending_owner_approval →` owner **approves** (`confirmed`) or **rejects** (`rejected`), or the `responseDeadline` lapses (`auto_rejected`). Payment authorization vs. capture timing differs by mode — for request-to-book the seeker's funds should not be finally captured until the owner approves (else a refund is owed on every auto-reject).


**Payment**
```
id, bookingId, gateway (razorpay), gatewayPaymentId, amount, currency,
status (created|authorized|captured|failed|refunded|partially_refunded),
refunds[] {id, amount, reason, by, at}, createdAt
```

**Payout (admin-introduced)**
```
id, hostId, period {from,to}, grossEarnings, commission, netPayable,
status (scheduled|processing|paid|failed|on_hold), method, reference,
triggeredBy?, createdAt, paidAt?
```

**WalletTransaction (credits)**
```
id, userId, type (credit|debit|adjustment), amount, reason, relatedBookingId?,
issuedBy? (admin id for manual adjustments), balanceAfter, createdAt
```

**Review**
```
id, listingId, seekerId, rating (1-5), text, status (visible|hidden|flagged|removed),
moderatedBy?, moderationReason?, createdAt
```

**SupportThread**
```
id, userId, subject, status (open|pending|resolved|closed), assigneeAdminId?,
priority, lastMessageAt, channelToken (SSE), messages[]
```

**NotificationCampaign**
```
id, title, body, deepLinkType (matches FCM payload types), audience {segment|userIds},
scheduledAt?, status (draft|scheduled|sending|sent|failed), sentCount, createdBy
```

**AdminUser**
```
id, email, name, status (active|disabled), roles[], totpEnabled, lastLoginAt, createdAt
```

**Role / Permission**
```
Role { id, name, permissions[] }
Permission = "domain.action[:scope]"  e.g. "wallet.adjust:capped"
```

**AuditLog**
```
id, actorAdminId, action, targetType, targetId, reason?, metadata (before/after),
ip, requestId, createdAt
```

> **Relationships:** a `Host` extends a `User` (1:1 by `userId`). A `Booking` ties `seekerId`, `hostId`, `listingId`, and one `Payment`. `Payout` aggregates completed `Bookings` for a host over a period, net of commission.

---

## 8. Authentication & Authorization (RBAC)

**Admin login flow**
1. Email + password → if valid and TOTP enabled, prompt for 6-digit TOTP.
2. On success: short-lived access JWT (in memory) + httpOnly refresh cookie.
3. Access token carries `adminId` and resolved `permissions[]` (or the client fetches `/admin/me`).
4. 401 → silent refresh; refresh failure → forced re-login.

**Permission catalogue (representative)**

| Permission | Grants |
| --- | --- |
| `user.read` / `user.suspend` / `user.delete` | View / suspend / soft-delete seekers |
| `host.read` / `host.verify` / `host.suspend` | View hosts / approve-reject KYC / suspend |
| `listing.read` / `listing.approve` / `listing.edit` / `listing.takedown` | Listing lifecycle |
| `booking.read` / `booking.cancel` / `booking.override` | View / admin-cancel / force owner-approval decisions on request-to-book bookings |
| `payment.read` / `payment.refund` | View payments / issue refunds |
| `payout.read` / `payout.trigger` / `payout.hold` | Payout lifecycle |
| `wallet.read` / `wallet.adjust` / `wallet.adjust:capped` | View / adjust credits (capped = per-txn limit) |
| `review.read` / `review.moderate` | Hide/remove reviews |
| `support.read` / `support.reply` / `support.assign` | Support console |
| `notification.send` | Push campaigns |
| `config.read` / `config.write` | Config + feature flags |
| `admin.read` / `admin.manage` | Manage admin users/roles |
| `audit.read` | View audit log |
| `export.run` | Run PII-bearing exports |

**Enforcement rules**
- Server checks permission on **every** admin endpoint; the SPA mirrors the same map to hide controls.
- Irreversible actions (refund, payout trigger, account delete, credit issue) require a confirmation modal with a typed reason; the reason is persisted to `AuditLog`.
- `:capped` scopes carry a numeric limit (e.g. support agents can issue ≤ ₹500 goodwill credit per transaction); larger amounts require Finance.
- Sensitive PII exports require `export.run` and are themselves audited.

---

## 9. Module Specifications

Each module below lists: **purpose · key screens · primary actions · API · permissions**.

### 9.1 Dashboard & Analytics
- **Purpose:** at-a-glance marketplace health and operational queues.
- **Screens:** KPI overview (GMV, bookings today/7d/30d, active listings, new hosts, refund rate, payout backlog); time-series charts; queue widgets (pending KYC, flagged reviews, open support, on-hold payouts) that deep-link into the relevant module.
- **API:** `GET /admin/metrics/overview?range=`, `GET /admin/metrics/timeseries?metric=&range=`.
- **Permissions:** any authenticated admin sees role-appropriate widgets; Analyst sees all read-only.

### 9.2 Users (Seekers)
- **Purpose:** find and manage seeker accounts.
- **Screens:** searchable/filterable user table (by phone, email, status, flagged); user detail (profile, vehicles, wallet balance, booking history, support threads, audit trail).
- **Actions:** suspend / reactivate, soft-delete, adjust wallet credits, view bookings, force-logout sessions.
- **API:** `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `POST /admin/users/:id/wallet-adjust`.
- **Permissions:** `user.read`, `user.suspend`, `user.delete`, `wallet.adjust`.

### 9.3 Hosts & KYC
- **Purpose:** verify hosts and manage their standing.
- **Screens:** host table with `kycStatus` filter; **KYC review queue** (document viewer side-by-side with approve/reject + reason); host detail (listings, earnings, payout account, ratings).
- **Actions:** approve / reject KYC, request re-submission, suspend host (auto-pauses their listings), edit payout account flags.
- **API:** `GET /admin/hosts`, `GET /admin/hosts/:id`, `POST /admin/hosts/:id/kyc/decision`, `PATCH /admin/hosts/:id/status`.
- **Permissions:** `host.read`, `host.verify`, `host.suspend`.

### 9.4 Listings Moderation
- **Purpose:** keep the inventory clean and accurate.
- **Screens:** listings table (status, host, vehicle types, **booking mode**, geo); **review queue** for `pending_review`; listing detail with photo gallery, map, amenities, pricing, and a moderation panel.
- **Actions:** approve / reject (with note), pause / unpause, edit corrections, takedown, set **booking mode** (instant-book vs request-to-book) eligibility.
- **API:** `GET /admin/listings`, `GET /admin/listings/:id`, `POST /admin/listings/:id/moderate`, `PATCH /admin/listings/:id`.
- **Permissions:** `listing.read`, `listing.approve`, `listing.edit`, `listing.takedown`.

### 9.5 Bookings
- **Purpose:** investigate and resolve bookings and disputes across both booking modes.
- **Screens:** bookings table (status, mode, date range, listing, seeker, host, amount); booking detail (full lifecycle timeline including any owner-approval step, linked payment, slot/bay, parties, dispute notes).
- **Actions:** admin-cancel (with reason + optional refund), mark dispute resolved, contact either party (opens support thread).
- **API:** `GET /admin/bookings`, `GET /admin/bookings/:id`, `POST /admin/bookings/:id/cancel`.
- **Permissions:** `booking.read`, `booking.cancel` (+ `payment.refund` if refunding).

### 9.5a Owner-Approval Requests
- **Purpose:** oversee the **request-to-book** flow where owners approve or reject seeker requests before a booking is confirmed. This is the admin-side window into the owners' in-app *Requests* screen.
- **Why it exists:** request-to-book bookings sit in `pending_owner_approval` with a `responseDeadline`; if the owner doesn't act, they `auto_reject`. Auto-rejects strand seekers (and may owe refunds), so Ops needs visibility and intervention.
- **Screens:**
  - **Pending-approval queue** — all `pending_owner_approval` bookings sorted by deadline, with a countdown, owner, seeker, listing, slot, and amount; highlights requests nearing auto-reject.
  - **Auto-reject / rejection log** — recently `auto_rejected` and owner-`rejected` requests with reasons, to spot owners who routinely ignore or decline requests.
  - **Request detail** — seeker trust context (rating, prior bookings, verification), owner context, slot/bay, vehicle type, and the decision history.
- **Actions:**
  - **Force-approve** or **force-reject** a stuck request on the owner's behalf (audited, with reason).
  - **Extend the response window** (push `responseDeadline`) when an owner needs more time or a deadline expired unfairly.
  - **Cancel + refund** an expired/auto-rejected request so the seeker isn't left paying for nothing.
  - **Flag an owner** for chronic non-response or high rejection rate (feeds Trust & Safety / host standing).
- **API:** `GET /admin/bookings?status=pending_owner_approval&sort=responseDeadline`, `POST /admin/bookings/:id/owner-decision` (`{decision: approved|rejected, reason?, onBehalfOfOwner: true}`), `POST /admin/bookings/:id/extend-deadline`, `GET /admin/owners/:hostId/approval-stats`.
- **Permissions:** `booking.read`, `booking.cancel`; force-decision requires `booking.override` (a higher-privilege grant held by Ops leads / Super Admin).
- **Config dependency:** the owner response window (auto-reject timeout) and commission rate are tuned in [Configuration](#912-configuration--feature-flags).

### 9.6 Payments & Refunds
- **Purpose:** payment visibility and refund issuance against Razorpay.
- **Screens:** payments table (status, gateway id, booking, amount); payment detail with refund history; refund modal (full/partial, reason, idempotency key auto-generated).
- **Actions:** issue full/partial refund, reconcile against gateway, flag mismatch.
- **API:** `GET /admin/payments`, `GET /admin/payments/:id`, `POST /admin/payments/:id/refund` (`Idempotency-Key` required).
- **Permissions:** `payment.read`, `payment.refund`.

### 9.7 Payouts (Host Settlements)
- **Purpose:** settle host earnings net of commission.
- **Screens:** payout runs by period; per-host payout detail (constituent bookings, gross, commission, net); on-hold queue.
- **Actions:** generate payout run for a period, trigger payout, place/release hold, retry failed.
- **API:** `GET /admin/payouts`, `POST /admin/payouts/run`, `POST /admin/payouts/:id/trigger`, `POST /admin/payouts/:id/hold`.
- **Permissions:** `payout.read`, `payout.trigger`, `payout.hold`.

### 9.8 Wallet & Credits
- **Purpose:** administer the **credits-only** wallet (no top-ups exist).
- **Screens:** per-user transaction ledger; bulk credit issuance (e.g. apology/campaign credits) with audience preview.
- **Actions:** issue credit, debit/clawback, adjustment with mandatory reason. Capped for Support, uncapped for Finance.
- **API:** `GET /admin/users/:id/wallet`, `POST /admin/users/:id/wallet-adjust`, `POST /admin/wallet/bulk-credit`.
- **Permissions:** `wallet.read`, `wallet.adjust`, `wallet.adjust:capped`.

### 9.9 Reviews Moderation
- **Purpose:** keep ratings trustworthy.
- **Screens:** flagged-reviews queue; review detail with listing/seeker context.
- **Actions:** hide, remove, restore, with reason; warn or suspend the author.
- **API:** `GET /admin/reviews?status=flagged`, `POST /admin/reviews/:id/moderate`.
- **Permissions:** `review.read`, `review.moderate`.

### 9.10 Support Console
- **Purpose:** the agent side of the in-app support chat (SSE).
- **Screens:** thread inbox (filter by status/assignee/priority); conversation view with live message stream, user context panel (recent bookings, wallet, flags), canned responses.
- **Actions:** reply, assign/reassign, set priority, resolve/close, escalate, issue capped goodwill credit inline.
- **API:** `GET /admin/support/threads`, `GET /admin/support/threads/:id`, SSE `GET /admin/support/threads/:id/stream` (admin SSE token), `POST /admin/support/threads/:id/reply`, `PATCH /admin/support/threads/:id`.
- **Permissions:** `support.read`, `support.reply`, `support.assign`.

### 9.11 Notifications & Campaigns
- **Purpose:** compose and send FCM push, matching the app's type-routed deep links.
- **Screens:** campaign list; composer (title, body, deep-link type picker constrained to known FCM `type` values, audience builder, schedule, test-send to a device); delivery report.
- **Actions:** draft, test-send, schedule, send now, cancel scheduled.
- **API:** `GET /admin/notifications`, `POST /admin/notifications`, `POST /admin/notifications/:id/send`, `POST /admin/notifications/test`.
- **Permissions:** `notification.send`.
- **Guardrail:** sending to a broad audience requires explicit confirmation and is rate-limited; deep-link type must be a recognized FCM payload type so taps route correctly in the app.

### 9.12 Configuration & Feature Flags
- **Purpose:** tune platform behaviour without a deploy.
- **Screens:** config editor (commission %, **owner response window / auto-reject timeout for request-to-book**, cancellation windows, refund policy, min/max pricing bounds, supported cities); feature-flag toggles (e.g. instant-book rollout, default booking mode for new listings, new payment methods).
- **Actions:** edit config (with diff preview + confirm), toggle flags, view change history.
- **API:** `GET /admin/config`, `PUT /admin/config`, `GET /admin/flags`, `PATCH /admin/flags/:key`.
- **Permissions:** `config.read`, `config.write`.

### 9.13 Admin Users & Roles
- **Purpose:** manage who can do what.
- **Screens:** admin user list; role editor (permission checkboxes grouped by domain); invite admin.
- **Actions:** invite/disable admin, assign roles, enforce TOTP, create/edit roles.
- **API:** `GET /admin/admins`, `POST /admin/admins/invite`, `PATCH /admin/admins/:id`, `GET/POST/PATCH /admin/roles`.
- **Permissions:** `admin.read`, `admin.manage` (Super Admin only).

### 9.14 Audit Log
- **Purpose:** answer "who did what, when, and why."
- **Screens:** filterable audit table (actor, action, target type/id, date); entry detail with before/after metadata and request id.
- **Actions:** filter, export (audited).
- **API:** `GET /admin/audit`, `GET /admin/audit/:id`.
- **Permissions:** `audit.read`.

---

## 10. Admin API Specification

**Base:** `https://api.parkingslot.com/api/v1/admin`
**Auth:** `Authorization: Bearer <admin-jwt>` on every request.
**Conventions:** JSON; ISO-8601 UTC timestamps; cursor or page/limit pagination; `Idempotency-Key` required on money mutations; standard error envelope.

**Error envelope**
```json
{ "error": { "code": "FORBIDDEN", "message": "Missing permission: payment.refund", "requestId": "req_abc123" } }
```

**Pagination & filtering (list endpoints)**
```
GET /admin/<resource>?page=1&limit=25&sort=-createdAt&status=...&q=<search>
→ { "data": [...], "page": 1, "limit": 25, "total": 1240 }
```

**Representative endpoints**

| Method & Path | Purpose | Permission |
| --- | --- | --- |
| `GET /admin/me` | Current admin + resolved permissions | (any) |
| `GET /admin/metrics/overview` | Dashboard KPIs | (any) |
| `GET /admin/users` · `GET /admin/users/:id` | List / detail seekers | `user.read` |
| `PATCH /admin/users/:id/status` | Suspend / reactivate / delete | `user.suspend` / `user.delete` |
| `POST /admin/users/:id/wallet-adjust` | Issue/debit credits (reason req.) | `wallet.adjust[:capped]` |
| `GET /admin/hosts` · `GET /admin/hosts/:id` | List / detail hosts | `host.read` |
| `POST /admin/hosts/:id/kyc/decision` | Approve / reject KYC | `host.verify` |
| `GET /admin/listings` · `GET /admin/listings/:id` | List / detail listings | `listing.read` |
| `POST /admin/listings/:id/moderate` | Approve / reject / takedown | `listing.approve` / `listing.takedown` |
| `GET /admin/bookings` · `GET /admin/bookings/:id` | List / detail bookings | `booking.read` |
| `POST /admin/bookings/:id/cancel` | Admin-cancel (+ optional refund) | `booking.cancel` |
| `POST /admin/bookings/:id/owner-decision` | Force approve/reject a request-to-book booking on the owner's behalf | `booking.override` |
| `POST /admin/bookings/:id/extend-deadline` | Push the owner-approval `responseDeadline` | `booking.override` |
| `GET /admin/payments/:id` | Payment detail | `payment.read` |
| `POST /admin/payments/:id/refund` | Refund (idempotent) | `payment.refund` |
| `POST /admin/payouts/run` | Generate payout run | `payout.trigger` |
| `POST /admin/payouts/:id/trigger` | Pay a host (idempotent) | `payout.trigger` |
| `GET /admin/reviews?status=flagged` | Moderation queue | `review.read` |
| `POST /admin/reviews/:id/moderate` | Hide / remove / restore | `review.moderate` |
| `GET /admin/support/threads/:id/stream` | SSE message stream | `support.read` |
| `POST /admin/support/threads/:id/reply` | Agent reply | `support.reply` |
| `POST /admin/notifications/:id/send` | Send push campaign | `notification.send` |
| `PUT /admin/config` | Update platform config | `config.write` |
| `POST /admin/admins/invite` | Invite admin | `admin.manage` |
| `GET /admin/audit` | Audit log | `audit.read` |

**Example: issue refund**
```http
POST /api/v1/admin/payments/pay_9Kz/refund
Authorization: Bearer <admin-jwt>
Idempotency-Key: 7c1f0e2a-...
Content-Type: application/json

{ "amount": 12000, "reason": "Host cancelled last-minute; full refund per policy" }
```
```json
{ "data": { "refundId": "rfnd_44", "paymentId": "pay_9Kz",
  "amount": 12000, "status": "processing", "auditId": "aud_91" } }
```

> The admin API is best maintained as an **OpenAPI 3.1 spec**; the console's TypeScript DTOs and the API client are generated from it so the two never drift.

---

## 11. Design System & UI Conventions

The console is desktop-dense and information-first, but it should feel like the same product as the app.

- **Brand carry-over:** the app's deep navy/blue brand and "P" mark anchor the top bar and login. Typeface **Plus Jakarta Sans** (as in the app) for continuity.
- **Layout:** persistent left sidebar (collapsible), top bar with global search, content area with page header + primary actions on the right.
- **Tables first:** every list module is a dense data table with column sorting, server-side pagination, saved filters, row selection, and bulk actions.
- **Detail = master/detail:** clicking a row opens a detail page or a slide-over drawer; never lose the list context.
- **Money & destructive actions** are always confirm-gated with a reason field; the affected amount and target are restated in the modal before commit.
- **Status as colour + label** (never colour alone, for accessibility): e.g. pending = amber, active/paid = green, failed/rejected = red, draft/paused = grey.
- **States:** every view defines loading (skeleton rows), empty (with the reason and a next action), and error (with `requestId` for support).
- **Density toggle** and keyboard navigation for power users (`/` focuses global search, `j/k` row nav).

---

## 12. Cross-Cutting Patterns

- **Global search** resolves a query against users (phone/email), hosts, listings, bookings, and payments, returning typed results that deep-link to detail pages.
- **Bulk actions** operate on selected rows (e.g. bulk-approve listings, bulk-credit users) and always pass through the same confirmation + audit path as single actions.
- **Exports** (CSV) are available on list views; any export containing PII requires `export.run` and is itself written to the audit log.
- **Optimistic updates** for low-risk toggles (pause listing); pessimistic confirm-then-refetch for money and lifecycle actions.
- **Idempotency** keys are generated client-side per money mutation and surfaced in the audit entry.
- **Time zones:** transmit/store UTC; render in the admin's locale with an explicit tz label on financial timestamps.
- **Request correlation:** every API response carries a `requestId`; the UI shows it in error toasts so support can trace issues to backend logs.

---

## 13. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| **Security** | Admin-only network (SSO/VPN), TOTP mandatory, short-lived tokens, server-side RBAC, audited mutations, no PII in URLs. |
| **Performance** | List views < 500 ms server response at p95 for 25-row pages; charts cached server-side. |
| **Reliability** | Money actions idempotent; refund/payout failures retryable and visible. |
| **Auditability** | 100% of mutations logged with actor, reason, target, before/after, requestId. |
| **Accessibility** | WCAG 2.1 AA: keyboard nav, focus order, status not by colour alone, labelled controls. |
| **Observability** | Front-end Sentry correlated with backend requestId; dashboards for admin error rates. |
| **Data handling** | Soft-delete by default; hard-delete only via a separate, Super-Admin-gated, double-confirmed path. |

---

## 14. Phased Delivery Plan

| Phase | Scope | Outcome |
| --- | --- | --- |
| **0 — Foundations** | Admin auth + TOTP, RBAC, app shell, audit log, `/admin/me`, dashboard skeleton. | Admins can log in; permissions enforced; everything auditable. |
| **1 — Marketplace ops** | Users, Hosts + KYC, Listings moderation, Bookings. | Trust & Safety and Ops can run the marketplace. |
| **2 — Finance** | Payments + Refunds, Payouts, Wallet/Credits, reconciliation. | Finance can move money safely and settle hosts. |
| **3 — Engagement** | Support console (SSE), Notifications/Campaigns. | Support and growth tooling live. |
| **4 — Platform control** | Configuration, Feature Flags, full Admin/Roles management, exports, analytics depth. | Self-serve platform tuning; reduced eng involvement. |

---

## 15. Open Questions & Assumptions

**Assumptions made (confirm before build):**
1. The backend can expose an `/api/v1/admin/**` route group reusing existing services (rather than requiring a separate admin service).
2. **Payouts** are not yet implemented on the mobile side; the console introduces the payout lifecycle and the backend will need supporting endpoints/tables.
3. Hosts undergo **KYC**; if KYC isn't currently captured in the app, the console's KYC module presumes a document-collection mechanism exists or will be added.
4. The wallet remains **credits-only**; the console issues/clawbacks credits but never processes top-ups.
5. Admin identities are **separate** from mobile `User` records and use email+password+TOTP (or company SSO).

**Open questions for the team:**
- Is there an existing commission model and rate, or does the console define it via config?
- What KYC document set and provider (if any) should the Hosts module integrate with?
- Refund authority limits — should partial refunds above a threshold require dual approval?
- Notification audiences — do user segments already exist server-side, or must the console build segment queries?
- SSO provider for admin auth, or in-house admin login for v1?

---

## Appendix A — Inferred Database Schema

> **⚠️ This schema is reverse-engineered from the Flutter API contract (`FLUTTER_API_REFERENCE.md` / `ParkingSlot_Flutter_Dev_Guide.md`), not read from your actual migrations.** No DDL, migration files, or ORM models have been shared, and the database engine itself was unconfirmed (the backend notes raised PostGIS vs. MongoDB geo-indexing as an open question). Treat every table, column, and type below as a **hypothesis to confirm**, not ground truth. Where the app's behaviour implies a table that no API endpoint confirms (notably the owner-approval requests), it is marked *inferred from wireframe*.

Convention assumed: PostgreSQL, `snake_case`, UUID primary keys, `created_at` / `updated_at` timestamptz on every table.

**Confirmed by the API contract** (field names/enums appear in real endpoints):

```
users
  id (uuid pk), phone (unique), name, email?, status,
  wallet_credit_balance, created_at, last_active_at
  -- role is contextual (?role=seeker|owner); see owner_profiles

owner_profiles                      -- a user who has listed a space
  id (uuid pk), user_id (fk users), display_name,
  kyc_status (unverified|pending|verified|rejected),
  payout_account_json, rating, total_earnings, status, created_at

vehicles
  id (uuid pk), user_id (fk users),
  type (bike|car), label, plate?, created_at

listings
  id (uuid pk), owner_user_id (fk users),
  title, address, geo (point / lat,lng),
  parking_type (e.g. apartment|covered|valet?),   -- 'valet' membership unconfirmed
  space_type, photos_json, amenities_json,
  vehicle_types (bike|car)[],
  price_per_hour, price_per_day?,
  booking_mode (instant_book|request_to_book),     -- 'instantBook' bool in API today
  spots_total, availability_rules_json,
  status (draft|pending_review|active|paused|rejected),
  active_filters (int, amenity count), created_at, updated_at

bookings
  id (uuid pk), listing_id (fk), seeker_user_id (fk users),
  owner_user_id (fk users), slot_start, slot_end,
  vehicle_type (bike|car), amount, currency,
  status (...), payment_id (fk payments?), created_at

payments                            -- Razorpay, 5-step flow in app
  id (uuid pk), booking_id (fk), gateway ('razorpay'),
  razorpay_order_id, razorpay_payment_id,
  amount, currency, status, created_at

refunds
  id (uuid pk), payment_id (fk), amount, reason,
  created_by?, created_at

reviews                             -- one per completed booking
  id (uuid pk), booking_id (fk, unique), listing_id (fk),
  seeker_user_id (fk users), rating (1-5), comment? (<=1000 chars),
  status, created_at

favorites
  user_id (fk users), listing_id (fk),
  created_at   -- composite pk (user_id, listing_id)

chat_threads
  id (uuid pk), thread_type (booking|support),
  booking_id? (fk), category? (booking|payment|listing|account|app_bug|other),
  subject?, ticket_ref?, status, created_at

chat_messages
  id (uuid pk), thread_id (fk chat_threads),
  sender_user_id (fk users), message, created_at

chat_presence
  user_id (fk users), booking_id?, last_seen_at

wallet_transactions                 -- credits only, no top-up
  id (uuid pk), user_id (fk users),
  type (credit|debit|adjustment), amount, reason,
  related_booking_id?, balance_after, created_at

notifications
  id (uuid pk), user_id (fk users), type (FCM payload type),
  title, body, data_json, read_at?, created_at

device_tokens                       -- dual FCM registration
  id (uuid pk), user_id (fk users), fcm_token, platform, created_at
```

**Inferred from the wireframe (no confirming API endpoint seen)** — the owner-approval / request-to-book mechanics:

```
-- These columns most likely live on `bookings` rather than a separate table:
bookings (additional)
  commission, net_to_host,
  owner_decision? (approved|rejected), owner_reject_reason?,
  response_deadline?, decided_at?, auto_rejected (bool), bay_id?

-- OR, if modelled separately:
booking_requests
  id (uuid pk), booking_id (fk), owner_user_id (fk),
  status (pending|approved|rejected|auto_rejected|expired),
  reject_reason?, response_deadline, decided_at?, created_at
```

**Admin-console-only tables (new — must be created):**

```
admin_users   (id, email, name, status, totp_secret, last_login_at, created_at)
admin_roles   (id, name)
admin_role_permissions (role_id, permission)         -- permission = "domain.action[:scope]"
admin_user_roles       (admin_user_id, role_id)
audit_logs    (id, actor_admin_id, action, target_type, target_id,
               reason?, metadata_json, ip, request_id, created_at)
payouts       (id, owner_user_id, period_from, period_to, gross_earnings,
               commission, net_payable, status, method, reference,
               triggered_by?, created_at, paid_at?)
platform_config (key, value_json, updated_by, updated_at)
feature_flags   (key, enabled, updated_by, updated_at)
```

**Known unknowns to confirm before relying on this:**
1. **DB engine & geo strategy** — Postgres+PostGIS, or MongoDB, or other? Determines listing geo columns/indexes.
2. **Owner model** — single `users` table + `owner_profiles`, or a capability/role flag, or something else?
3. **Owner-approval persistence** — columns on `bookings` vs. a `booking_requests` table; and the actual endpoints behind the owner *Requests* screen (not present in the API reference I have).
4. **Enums** — exact membership of `parking_type`, `space_type`, `booking status`, and whether `availability_status (available|partial|full)` / `spots_available` are stored or computed.
5. **KYC** — whether KYC docs/status exist today or are net-new.
6. **Payouts/commission** — whether any payout tables exist, or this is entirely new.

**To make this exact, share any one of:** `schema.sql` / the migrations folder, your ORM models (Prisma/TypeORM/Sequelize/SQLAlchemy/etc.), the actual `FLUTTER_API_REFERENCE.md`, or read access to the backend repo. Upload it and I'll replace this appendix with the real schema and re-reconcile the whole document.

---

*Document version 1.2 — companion to `ParkingSlot_Flutter_Dev_Guide.md`. The data model is reconciled against the Flutter **API contract**; the database layout in Appendix A is **inferred** and pending confirmation against actual migrations. Endpoint paths and permission names are proposed contracts to be ratified before implementation.*
