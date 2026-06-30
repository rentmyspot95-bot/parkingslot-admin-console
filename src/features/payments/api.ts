import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Payment, PaymentStatus } from '@/shared/types/domain'

export function usePayments(params: ListParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: ({ signal }) => fetchList<Payment>('/payments', params, signal),
  })
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: ({ signal }) => apiRequest<Payment>('/payments/' + id, { signal }),
    enabled: !!id,
  })
}

export interface RefundPayload {
  /** Amount in paise (use rupeesToPaise on admin-entered rupee values). */
  amount: number
  reason: string
}

/**
 * Issue a refund against a payment. Money mutation → idempotent: the client
 * auto-adds an Idempotency-Key header so retries don't double-refund.
 */
export function useRefund(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RefundPayload) =>
      apiRequest('/payments/' + id + '/refund', {
        method: 'POST',
        body: payload,
        idempotent: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payment', id] })
      qc.invalidateQueries({ queryKey: ['refunds'] })
    },
  })
}

/** A flattened refund row as returned by the `/refunds` list endpoint. */
export interface RefundRow {
  id: string
  paymentId: string
  bookingId?: string | null
  amount: number
  reason: string
  status: PaymentStatus | string
  by?: string | null
  at: string
}

export function useRefunds(params: ListParams) {
  return useQuery({
    queryKey: ['refunds', params],
    queryFn: ({ signal }) => fetchList<RefundRow>('/refunds', params, signal),
  })
}
