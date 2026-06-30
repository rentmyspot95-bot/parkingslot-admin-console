/**
 * Dev-only mock API. Patches window.fetch to answer /api/v1/admin/** requests
 * from in-memory fixtures (./data.ts). Enabled only when VITE_USE_MOCK === 'true'.
 *
 * Login: admin@parkingslot.com / admin  (any TOTP accepted).
 * This entire module is tree-shaken out of production builds when the flag is off.
 */
import * as db from './data'

const BASE = '/api/v1/admin'
const MOCK_TOKEN = 'mock-access-token'

interface Ctx {
  method: string
  path: string // path after BASE, e.g. "/users/usr_1"
  params: URLSearchParams
  body: Record<string, unknown> | undefined
  authed: boolean
}

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'mock_' + Math.random().toString(36).slice(2, 8) },
  })
}
const ok = (data: unknown) => json({ data })
const errOut = (status: number, code: string, message: string) =>
  json({ error: { code, message, requestId: 'mock_err' } }, status)

function paginate<T>(rows: T[], params: URLSearchParams, filter?: (row: T) => boolean): Response {
  let data = filter ? rows.filter(filter) : [...rows]
  const status = params.get('status')
  if (status) data = data.filter((r) => (r as { status?: string }).status === status)
  const page = Number(params.get('page') ?? '1') || 1
  const limit = Number(params.get('limit') ?? '25') || 25
  const total = data.length
  const start = (page - 1) * limit
  return json({ data: data.slice(start, start + limit), page, limit, total })
}

function matchId(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix + '/')) return null
  const rest = path.slice(prefix.length + 1)
  return rest.split('/')[0] || null
}

// Returns a Response, or null to fall through to the real network.
function route(ctx: Ctx): Response | null {
  const { method, path, params, body, authed } = ctx

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === '/auth/login' && method === 'POST') {
    const email = String(body?.email ?? '')
    const password = String(body?.password ?? '')
    if (email.toLowerCase() === db.MOCK_ADMIN.email && password === 'admin') {
      return ok({ accessToken: MOCK_TOKEN, admin: db.MOCK_ADMIN })
    }
    return errOut(401, 'INVALID_CREDENTIALS', 'Invalid email or password. Use admin@parkingslot.com / admin.')
  }
  if (path === '/auth/refresh' && method === 'POST') {
    // No persisted refresh cookie in the mock → force the login screen on boot.
    return errOut(401, 'NO_SESSION', 'No refresh session')
  }
  if (path === '/auth/logout' && method === 'POST') return ok({ ok: true })
  if (path === '/me') return authed ? ok(db.MOCK_ADMIN) : errOut(401, 'UNAUTHENTICATED', 'Sign in required')

  // Everything below requires the mock bearer token.
  if (!authed) return errOut(401, 'UNAUTHENTICATED', 'Sign in required')

  // ── Dashboard / search ──────────────────────────────────────────────────────
  if (path === '/metrics/overview') return ok(db.metricsOverview())
  if (path === '/metrics/queues') return ok(db.metricsOverview().queues)
  if (path === '/metrics/timeseries') return ok(db.timeseries(params.get('metric') ?? 'gmv'))
  if (path === '/search') return ok(db.globalSearch(params.get('q') ?? ''))

  // ── Users ───────────────────────────────────────────────────────────────────
  if (path === '/users') return paginate(db.users, params, byQuery(params, (u: typeof db.users[number]) => [u.name, u.phone, u.email ?? '']))
  {
    const id = matchId(path, '/users')
    if (id) {
      if (path.endsWith('/bookings')) return paginate(db.bookings.filter((b) => b.seekerId === id), params)
      if (path.endsWith('/wallet')) return paginate(db.walletTxns[id] ?? [], params)
      if (path.endsWith('/wallet-adjust') && method === 'POST') return ok({ ok: true, balanceAfter: 0 })
      if (path.endsWith('/status') && method === 'PATCH') return ok({ ...db.users.find((u) => u.id === id), status: body?.status })
      const u = db.users.find((x) => x.id === id)
      return u ? ok(u) : errOut(404, 'NOT_FOUND', 'User not found')
    }
  }

  // ── Hosts ────────────────────────────────────────────────────────────────────
  if (path === '/hosts') return paginate(db.hosts, params, byQuery(params, (h: typeof db.hosts[number]) => [h.displayName], 'kycStatus'))
  {
    const id = matchId(path, '/hosts')
    if (id) {
      if (path.endsWith('/kyc/decision') && method === 'POST') return ok({ ok: true })
      if (path.endsWith('/status') && method === 'PATCH') return ok({ ok: true })
      if (path.endsWith('/flag') && method === 'POST') return ok({ ok: true })
      if (path.endsWith('/approval-stats')) return ok({ hostId: id, pendingCount: 1, approvedCount: 4, rejectedCount: 1, autoRejectedCount: 2, avgResponseMinutes: 34, rejectionRate: 12.5 })
      const h = db.hosts.find((x) => x.id === id)
      return h ? ok(h) : errOut(404, 'NOT_FOUND', 'Host not found')
    }
  }

  // ── Listings ─────────────────────────────────────────────────────────────────
  if (path === '/listings') return paginate(db.listings, params, byQuery(params, (l: typeof db.listings[number]) => [l.title, l.address], 'bookingMode'))
  {
    const id = matchId(path, '/listings')
    if (id) {
      if (path.endsWith('/moderate') && method === 'POST') return ok({ ok: true })
      const l = db.listings.find((x) => x.id === id)
      if (l && method === 'PATCH') return ok({ ...l, ...body })
      return l ? ok(l) : errOut(404, 'NOT_FOUND', 'Listing not found')
    }
  }

  // ── Bookings ─────────────────────────────────────────────────────────────────
  if (path === '/bookings') return paginate(db.bookings, params, byQuery(params, (b: typeof db.bookings[number]) => [b.id, b.listingTitle ?? '', b.seekerName ?? '', b.hostName ?? ''], 'bookingMode'))
  {
    const id = matchId(path, '/bookings')
    if (id) {
      if (method === 'POST') return ok({ ok: true }) // cancel / owner-decision / extend-deadline / resolve-dispute
      const b = db.bookings.find((x) => x.id === id)
      return b ? ok(b) : errOut(404, 'NOT_FOUND', 'Booking not found')
    }
  }
  if (path.startsWith('/owners/') && path.endsWith('/approval-stats')) {
    const id = path.split('/')[2]
    return ok({ hostId: id, pendingCount: 1, approvedCount: 4, rejectedCount: 1, autoRejectedCount: 2, avgResponseMinutes: 34, rejectionRate: 12.5 })
  }

  // ── Payments / refunds ───────────────────────────────────────────────────────
  if (path === '/payments') return paginate(db.payments, params, byQuery(params, (p: typeof db.payments[number]) => [p.id, p.bookingId, p.gatewayPaymentId ?? '']))
  if (path === '/refunds') return paginate(db.refunds, params)
  {
    const id = matchId(path, '/payments')
    if (id) {
      if (path.endsWith('/refund') && method === 'POST') return ok({ refundId: 'rfnd_new', paymentId: id, amount: body?.amount, status: 'processing', auditId: 'aud_new' })
      const p = db.payments.find((x) => x.id === id)
      return p ? ok(p) : errOut(404, 'NOT_FOUND', 'Payment not found')
    }
  }

  // ── Payouts ──────────────────────────────────────────────────────────────────
  if (path === '/payouts' && method === 'GET') return paginate(db.payouts, params)
  if (path === '/payouts/run' && method === 'POST') return ok({ ok: true, created: 1 })
  {
    const id = matchId(path, '/payouts')
    if (id) {
      if (method === 'POST') return ok({ ok: true }) // trigger / hold
      const p = db.payouts.find((x) => x.id === id)
      return p ? ok(p) : errOut(404, 'NOT_FOUND', 'Payout not found')
    }
  }

  // ── Wallet bulk ──────────────────────────────────────────────────────────────
  if (path === '/wallet/bulk-credit' && method === 'POST') return ok({ ok: true, audienceCount: 1240 })

  // ── Reviews ──────────────────────────────────────────────────────────────────
  if (path === '/reviews') return paginate(db.reviews, params, byQuery(params, (r: typeof db.reviews[number]) => [r.text ?? '', r.listingTitle ?? '', r.seekerName ?? '']))
  {
    const id = matchId(path, '/reviews')
    if (id && path.endsWith('/moderate') && method === 'POST') return ok({ ok: true })
  }

  // ── Support ──────────────────────────────────────────────────────────────────
  if (path === '/support/threads') return paginate(db.supportThreads, params)
  {
    const id = matchId(path, '/support/threads')
    if (id) {
      if (path.endsWith('/messages')) return ok(db.supportMessages[id] ?? [])
      if (path.endsWith('/reply') && method === 'POST') return ok({ ok: true })
      if (method === 'PATCH') return ok({ ok: true })
      const t = db.supportThreads.find((x) => x.id === id)
      return t ? ok(t) : errOut(404, 'NOT_FOUND', 'Thread not found')
    }
  }

  // ── Notifications ────────────────────────────────────────────────────────────
  if (path === '/notifications') {
    if (method === 'POST') return ok({ id: 'cmp_new', ...body, status: 'draft', sentCount: 0 })
    return paginate(db.campaigns, params)
  }
  if (path === '/notifications/test' && method === 'POST') return ok({ ok: true })
  {
    const id = matchId(path, '/notifications')
    if (id && path.endsWith('/send') && method === 'POST') return ok({ ok: true, status: 'sending' })
  }

  // ── Config / flags ───────────────────────────────────────────────────────────
  if (path === '/config') {
    if (method === 'PUT') return ok({ ...db.config, ...(body?.config as object) })
    return ok(db.config)
  }
  if (path === '/flags') return ok(db.flags)
  {
    const key = matchId(path, '/flags')
    if (key && method === 'PATCH') return ok({ key, enabled: body?.enabled, updatedBy: 'adm_1', updatedAt: new Date().toISOString() })
  }

  // ── Admins / roles ───────────────────────────────────────────────────────────
  if (path === '/admins') return paginate(db.admins, params)
  if (path === '/admins/invite' && method === 'POST') return ok({ ok: true })
  if (matchId(path, '/admins') && method === 'PATCH') return ok({ ok: true })
  if (path === '/roles') {
    if (method === 'POST') return ok({ id: 'role_new', ...body })
    return ok(db.roles)
  }
  if (path.startsWith('/roles') && method === 'PATCH') return ok({ ok: true })

  // ── Audit ────────────────────────────────────────────────────────────────────
  if (path === '/audit') return paginate(db.audit, params, byQuery(params, (a: typeof db.audit[number]) => [a.action, a.actorName ?? '', a.targetId], 'targetType'))
  if (path === '/audit/export') return ok({ ok: true, url: 'mock://export.csv' })
  {
    const id = matchId(path, '/audit')
    if (id) {
      const a = db.audit.find((x) => x.id === id)
      return a ? ok(a) : errOut(404, 'NOT_FOUND', 'Audit entry not found')
    }
  }

  return null
}

/** Build a list filter from the `q` param across the given string fields. */
function byQuery<T>(params: URLSearchParams, fields: (row: T) => string[], extraKey?: string) {
  const q = (params.get('q') ?? '').toLowerCase()
  const extra = extraKey ? params.get(extraKey) : null
  return (row: T): boolean => {
    if (extra && (row as Record<string, unknown>)[extraKey!] !== extra) return false
    if (!q) return true
    return fields(row).some((f) => f.toLowerCase().includes(q))
  }
}

export function installMockApi() {
  const original = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const idx = url.indexOf(BASE)
    if (idx === -1) return original(input, init)

    const after = url.slice(idx + BASE.length)
    const [rawPath, queryStr = ''] = after.split('?')
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

    let body: Record<string, unknown> | undefined
    const rawBody = init?.body
    if (typeof rawBody === 'string' && rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch {
        body = undefined
      }
    }

    const authHeader =
      (init?.headers && new Headers(init.headers).get('Authorization')) ||
      (input instanceof Request ? input.headers.get('Authorization') : null)
    const authed = authHeader === `Bearer ${MOCK_TOKEN}`

    // Simulate a little latency so loading states are visible.
    await new Promise((r) => setTimeout(r, 120))

    const res = route({ method, path: rawPath, params: new URLSearchParams(queryStr), body, authed })
    if (res) return res

    // Unhandled admin path → 404 in the standard envelope (helps spot gaps).
    return errOut(404, 'NOT_FOUND', `Mock has no handler for ${method} ${rawPath}`)
  }

  // eslint-disable-next-line no-console
  console.info('%c[mock] Admin API mocked. Login: admin@parkingslot.com / admin', 'color:#3b46b3;font-weight:bold')
}
