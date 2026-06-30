import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { BookingMode, Listing } from '@/shared/types/domain'

export type ModerationAction = 'approve' | 'reject' | 'takedown' | 'pause' | 'unpause'

export interface ModerateListingVars {
  action: ModerationAction
  note?: string
}

export function useListings(params: ListParams) {
  return useQuery({
    queryKey: ['listings', params],
    queryFn: ({ signal }) => fetchList<Listing>('/listings', params, signal),
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: ({ signal }) => apiRequest<Listing>('/listings/' + id, { signal }),
    enabled: !!id,
  })
}

export function useModerateListing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: ModerateListingVars) =>
      apiRequest<Listing>('/listings/' + id + '/moderate', { method: 'POST', body: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['listing', id] })
    },
  })
}

export interface UpdateListingVars {
  title?: string
  address?: string
  pricePerHour?: number
  pricePerDay?: number | null
  bookingMode?: BookingMode
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UpdateListingVars) =>
      apiRequest<Listing>('/listings/' + id, { method: 'PATCH', body: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['listing', id] })
    },
  })
}
