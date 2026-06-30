import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { Review } from '@/shared/types/domain'

export function useReviews(params: ListParams) {
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: ({ signal }) => fetchList<Review>('/reviews', params, signal),
  })
}

export interface ModerateReviewPayload {
  action: 'hide' | 'remove' | 'restore'
  reason: string
}

export function useModerateReview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ModerateReviewPayload) =>
      apiRequest('/reviews/' + id + '/moderate', { method: 'POST', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}
