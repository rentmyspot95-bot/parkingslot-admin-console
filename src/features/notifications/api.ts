import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type { NotificationCampaign } from '@/shared/types/domain'

/** List notification campaigns — §9.11. */
export function useCampaigns(params: ListParams) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: ({ signal }) => fetchList<NotificationCampaign>('/notifications', params, signal),
  })
}

export interface CreateCampaignVars {
  title: string
  body: string
  deepLinkType: string
  audience: { segment?: string | null; userIds?: string[] | null }
  scheduledAt?: string | null
}

/** Save a campaign draft — §9.11. */
export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: CreateCampaignVars) =>
      apiRequest<NotificationCampaign>('/notifications', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

/** Send a campaign now (rate-limited, broad-audience guarded in UI) — §9.11. */
export function useSendCampaign(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<NotificationCampaign>('/notifications/' + id + '/send', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export interface TestSendVars {
  title: string
  body: string
  deepLinkType: string
  deviceToken: string
}

/** Fire a single test push to a device token — §9.11. */
export function useTestSend() {
  return useMutation({
    mutationFn: (vars: TestSendVars) =>
      apiRequest<{ delivered: boolean }>('/notifications/test', {
        method: 'POST',
        body: vars,
      }),
  })
}
