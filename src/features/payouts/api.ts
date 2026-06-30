import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Payout } from '@/shared/types/domain'

export function usePayouts(params: ListParams) {
  return useQuery({
    queryKey: ['payouts', params],
    queryFn: ({ signal }) => fetchList<Payout>('/payouts', params, signal),
  })
}

export function usePayout(id: string) {
  return useQuery({
    queryKey: ['payout', id],
    queryFn: ({ signal }) => apiRequest<Payout>('/payouts/' + id, { signal }),
    enabled: !!id,
  })
}

export interface RunPayoutPayload {
  from: string
  to: string
}

/** Generate a payout run for a period. Money mutation → idempotent. */
export function useRunPayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RunPayoutPayload) =>
      apiRequest('/payouts/run', { method: 'POST', body: payload, idempotent: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
    },
  })
}

/** Pay a host. Money/irreversible mutation → idempotent. */
export function useTriggerPayout(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest('/payouts/' + id + '/trigger', { method: 'POST', idempotent: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
      qc.invalidateQueries({ queryKey: ['payout', id] })
    },
  })
}

export interface HoldPayoutPayload {
  hold: boolean
  reason: string
}

export function useHoldPayout(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: HoldPayoutPayload) =>
      apiRequest('/payouts/' + id + '/hold', { method: 'POST', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
      qc.invalidateQueries({ queryKey: ['payout', id] })
    },
  })
}
