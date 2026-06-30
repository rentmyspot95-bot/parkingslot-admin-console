import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Host } from '@/shared/types/domain'

export function useHosts(params: ListParams) {
  return useQuery({
    queryKey: ['hosts', params],
    queryFn: ({ signal }) => fetchList<Host>('/hosts', params, signal),
  })
}

export function useHost(id: string) {
  return useQuery({
    queryKey: ['host', id],
    queryFn: ({ signal }) => apiRequest<Host>('/hosts/' + id, { signal }),
    enabled: !!id,
  })
}

export interface KycDecisionPayload {
  decision: 'approve' | 'reject' | 'resubmit'
  reason?: string
}

export function useKycDecision(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: KycDecisionPayload) =>
      apiRequest('/hosts/' + id + '/kyc/decision', { method: 'POST', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosts'] })
      qc.invalidateQueries({ queryKey: ['host', id] })
    },
  })
}

export interface UpdateHostStatusPayload {
  status: 'active' | 'suspended'
  reason: string
}

export function useUpdateHostStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateHostStatusPayload) =>
      apiRequest('/hosts/' + id + '/status', { method: 'PATCH', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hosts'] })
      qc.invalidateQueries({ queryKey: ['host', id] })
    },
  })
}
