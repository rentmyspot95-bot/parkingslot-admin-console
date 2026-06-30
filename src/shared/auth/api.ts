import { apiRequest } from '../api/client'
import type { SessionAdmin } from './session'

export interface LoginPayload {
  email: string
  password: string
  totp?: string
}

export interface LoginResult {
  accessToken: string
  admin: SessionAdmin
  /** True when the server accepted email+password but now needs a TOTP code. */
  totpRequired?: boolean
}

export function login(payload: LoginPayload): Promise<LoginResult> {
  return apiRequest<LoginResult>('/auth/login', { method: 'POST', body: payload })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

/** Resolve the current admin and their effective permissions. */
export function fetchMe(): Promise<SessionAdmin> {
  return apiRequest<SessionAdmin>('/me')
}
