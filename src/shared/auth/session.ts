import { create } from 'zustand'
import type { Permission } from './permissions'
import { hasAnyPermission, hasPermission } from './permissions'
import { setAccessToken } from '../api/client'

export interface SessionAdmin {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

interface SessionState {
  admin: SessionAdmin | null
  permissionSet: Set<string>
  status: 'loading' | 'authenticated' | 'unauthenticated'
  setSession: (admin: SessionAdmin, accessToken?: string) => void
  clearSession: () => void
  setStatus: (status: SessionState['status']) => void
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean
}

export const useSessionStore = create<SessionState>((set, get) => ({
  admin: null,
  permissionSet: new Set(),
  status: 'loading',
  setSession: (admin, accessToken) => {
    if (accessToken) setAccessToken(accessToken)
    set({
      admin,
      permissionSet: new Set(admin.permissions),
      status: 'authenticated',
    })
  },
  clearSession: () => {
    setAccessToken(null)
    set({ admin: null, permissionSet: new Set(), status: 'unauthenticated' })
  },
  setStatus: (status) => set({ status }),
  can: (permission) => hasPermission(get().permissionSet, permission),
  canAny: (permissions) => hasAnyPermission(get().permissionSet, permissions),
}))
