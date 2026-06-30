import type { ApiErrorBody } from '../types/common'
import { idempotencyKey as genIdempotencyKey } from '../lib/id'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1/admin'

/** Thrown for any non-2xx admin API response. Carries the parsed error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.error?.message ?? `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code ?? 'UNKNOWN'
    this.requestId = body?.error?.requestId
  }

  get isForbidden() {
    return this.status === 403
  }
  get isUnauthorized() {
    return this.status === 401
  }
}

// ── Token plumbing ───────────────────────────────────────────────────────────
// Access token lives in memory only; the refresh token is an httpOnly cookie the
// browser sends automatically to the refresh endpoint.
let accessToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}
export function getAccessToken() {
  return accessToken
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

// ── 401 silent refresh (single-flight) ───────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!res.ok) return false
        const body = (await res.json()) as { data?: { accessToken?: string } }
        if (body.data?.accessToken) {
          setAccessToken(body.data.accessToken)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  /** Attach a generated Idempotency-Key header (money mutations). */
  idempotent?: boolean
  /** Use a caller-supplied idempotency key instead of generating one. */
  idempotencyKey?: string
  signal?: AbortSignal
  headers?: Record<string, string>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function rawRequest<T>(path: string, opts: RequestOptions, isRetry: boolean): Promise<T> {
  const { method = 'GET', query, body, idempotent, idempotencyKey, signal, headers } = opts

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  }
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'
  if (idempotent || idempotencyKey) {
    finalHeaders['Idempotency-Key'] = idempotencyKey ?? genIdempotencyKey()
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  // 401 → attempt a single silent refresh, then replay once.
  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return rawRequest<T>(path, opts, true)
    onUnauthorized?.()
  }

  if (res.status === 204) return undefined as T

  let parsed: unknown = null
  const text = await res.text()
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, parsed as ApiErrorBody)
  }

  // The API wraps payloads as { data: ... }; unwrap when present.
  if (parsed && typeof parsed === 'object' && 'data' in (parsed as Record<string, unknown>)) {
    return (parsed as { data: T }).data
  }
  return parsed as T
}

/** Returns the unwrapped `data` payload. */
export function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return rawRequest<T>(path, opts, false)
}

/** Returns the full paginated envelope ({ data, page, limit, total }) without unwrapping. */
export async function apiRequestRaw<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal, headers } = opts
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers }
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json'

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })
  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return apiRequestRaw<T>(path, opts)
    onUnauthorized?.()
  }
  const text = await res.text()
  const parsed = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, parsed as ApiErrorBody)
  return parsed as T
}

export const apiBaseUrl = BASE_URL
