import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { AdminStatus, AdminUser, Role } from '@/shared/types/domain'

/** List admin users — §9.13. */
export function useAdmins(params: ListParams) {
  return useQuery({
    queryKey: ['admins', params],
    queryFn: ({ signal }) => fetchList<AdminUser>('/admins', params, signal),
  })
}

/** List roles — §9.13. */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: ({ signal }) => apiRequest<Role[]>('/roles', { signal }),
  })
}

export interface InviteAdminVars {
  email: string
  name: string
  roles: string[]
}

/** Invite a new admin — §9.13. */
export function useInviteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: InviteAdminVars) =>
      apiRequest<AdminUser>('/admins/invite', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
  })
}

export interface UpdateAdminVars {
  status?: AdminStatus
  roles?: string[]
  totpEnabled?: boolean
}

/** Disable/enable, reassign roles, enforce TOTP — §9.13. */
export function useUpdateAdmin(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UpdateAdminVars) =>
      apiRequest<AdminUser>('/admins/' + id, {
        method: 'PATCH',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
  })
}

export interface SaveRoleVars {
  name: string
  permissions: string[]
}

/**
 * Create (POST) or update (PATCH) a role — §9.13.
 * Pass `roleId` to edit an existing role; omit to create a new one.
 */
export function useSaveRole(roleId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: SaveRoleVars) =>
      roleId
        ? apiRequest<Role>('/roles', { method: 'PATCH', body: { id: roleId, ...vars } })
        : apiRequest<Role>('/roles', { method: 'POST', body: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
