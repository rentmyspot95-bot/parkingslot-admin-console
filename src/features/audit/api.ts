import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { AuditLogEntry } from '@/shared/types/domain'

export function useAuditLog(params: ListParams) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: ({ signal }) => fetchList<AuditLogEntry>('/audit', params, signal),
  })
}

export function useAuditEntry(id: string) {
  return useQuery({
    queryKey: ['audit-entry', id],
    queryFn: ({ signal }) => apiRequest<AuditLogEntry>('/audit/' + id, { signal }),
    enabled: !!id,
  })
}
