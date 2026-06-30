import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Booking, OwnerApprovalStats, OwnerDecision } from '@/shared/types/domain'

/** List bookings (§9.5). */
export function useBookings(params: ListParams) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: ({ signal }) => fetchList<Booking>('/bookings', params, signal),
  })
}

/** Single booking detail (§9.5). */
export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: ({ signal }) => apiRequest<Booking>('/bookings/' + id, { signal }),
    enabled: !!id,
  })
}

export interface CancelBookingVars {
  reason: string
  refund?: boolean
}

/** Admin-cancel a booking, optionally refunding (§9.5). Idempotent (touches money). */
export function useCancelBooking(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: CancelBookingVars) =>
      apiRequest<Booking>('/bookings/' + id + '/cancel', {
        method: 'POST',
        body: vars,
        idempotent: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['booking', id] })
    },
  })
}

/** Resolve a disputed booking (§9.5). Distinct from cancel — the booking is not voided. */
export function useResolveDispute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { reason: string }) =>
      apiRequest<Booking>('/bookings/' + id + '/resolve-dispute', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['booking', id] })
    },
  })
}

export interface OwnerDecisionVars {
  decision: OwnerDecision
  reason?: string
  onBehalfOfOwner: true
}

/** Force-approve / force-reject a request-to-book booking on the owner's behalf (§9.5a). */
export function useOwnerDecision(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: OwnerDecisionVars) =>
      apiRequest<Booking>('/bookings/' + id + '/owner-decision', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['booking', id] })
    },
  })
}

export interface ExtendDeadlineVars {
  minutes: number
}

/** Push the owner-approval responseDeadline (§9.5a). */
export function useExtendDeadline(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: ExtendDeadlineVars) =>
      apiRequest<Booking>('/bookings/' + id + '/extend-deadline', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['booking', id] })
    },
  })
}

/** Owner approval responsiveness stats, to spot chronic non-responders (§9.5a). */
export function useApprovalStats(hostId: string) {
  return useQuery({
    queryKey: ['owner-approval-stats', hostId],
    queryFn: ({ signal }) =>
      apiRequest<OwnerApprovalStats>('/owners/' + hostId + '/approval-stats', { signal }),
    enabled: !!hostId,
  })
}
