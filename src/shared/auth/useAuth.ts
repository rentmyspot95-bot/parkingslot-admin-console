import { useCallback } from 'react'
import { useSessionStore } from './session'
import type { Permission } from './permissions'
import * as authApi from './api'
import { setAccessToken } from '../api/client'

/** Convenience hook over the session store + auth API. */
export function useAuth() {
  const admin = useSessionStore((s) => s.admin)
  const status = useSessionStore((s) => s.status)
  const setSession = useSessionStore((s) => s.setSession)
  const clearSession = useSessionStore((s) => s.clearSession)
  const setStatus = useSessionStore((s) => s.setStatus)

  const signIn = useCallback(
    async (payload: authApi.LoginPayload) => {
      const result = await authApi.login(payload)
      if (result.totpRequired) return result
      setSession(result.admin, result.accessToken)
      return result
    },
    [setSession],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  /** On boot: try to restore a session via the refresh cookie → /me. */
  const restore = useCallback(async () => {
    setStatus('loading')
    try {
      const me = await authApi.fetchMe()
      setSession(me)
    } catch {
      setAccessToken(null)
      setStatus('unauthenticated')
    }
  }, [setSession, setStatus])

  return { admin, status, signIn, signOut, restore }
}

/** Reactive permission check for conditional rendering. */
export function useCan(permission: Permission): boolean {
  return useSessionStore((s) => s.can(permission))
}

export function useCanAny(permissions: readonly Permission[]): boolean {
  return useSessionStore((s) => s.canAny(permissions))
}
