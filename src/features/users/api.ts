import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Booking, User, UserStatus, WalletTransaction } from '@/shared/types/domain'

export function useUsers(params: ListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: ({ signal }) => fetchList<User>('/users', params, signal),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => apiRequest<User>('/users/' + id, { signal }),
    enabled: !!id,
  })
}

export function useUserBookings(id: string) {
  return useQuery({
    queryKey: ['user', id, 'bookings'],
    queryFn: ({ signal }) => fetchList<Booking>('/users/' + id + '/bookings', { limit: 50 }, signal),
    enabled: !!id,
  })
}

export function useUserWallet(id: string) {
  return useQuery({
    queryKey: ['user', id, 'wallet'],
    queryFn: ({ signal }) =>
      fetchList<WalletTransaction>('/users/' + id + '/wallet', { limit: 50 }, signal),
    enabled: !!id,
  })
}

export interface UpdateUserStatusVars {
  status: UserStatus
  reason: string
}

export function useUpdateUserStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UpdateUserStatusVars) =>
      apiRequest<User>('/users/' + id + '/status', { method: 'PATCH', body: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
  })
}

export type WalletAdjustType = 'credit' | 'debit' | 'adjustment'

export interface WalletAdjustVars {
  type: WalletAdjustType
  amount: number
  reason: string
}

export function useWalletAdjust(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: WalletAdjustVars) =>
      apiRequest<WalletTransaction>('/users/' + id + '/wallet-adjust', {
        method: 'POST',
        body: vars,
        idempotent: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
  })
}
