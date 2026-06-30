import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import type { ListParams } from '@/shared/types/common'
import type {
  SupportMessage,
  SupportPriority,
  SupportThread,
  SupportThreadStatus,
} from '@/shared/types/domain'

/** List support threads (inbox) — §9.10. */
export function useThreads(params: ListParams) {
  return useQuery({
    queryKey: ['threads', params],
    queryFn: ({ signal }) => fetchList<SupportThread>('/support/threads', params, signal),
  })
}

/** Single thread metadata — §9.10. */
export function useThread(id: string) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: ({ signal }) => apiRequest<SupportThread>('/support/threads/' + id, { signal }),
    enabled: !!id,
  })
}

/**
 * Thread messages. Production streams these over SSE
 * (`GET /admin/support/threads/:id/stream`); here we poll instead — the page
 * sets `refetchInterval` on this query.
 */
export function useThreadMessages(id: string) {
  return useQuery({
    queryKey: ['thread', id, 'messages'],
    queryFn: ({ signal }) =>
      apiRequest<SupportMessage[]>('/support/threads/' + id + '/messages', { signal }),
    enabled: !!id,
    // Poll as a stand-in for the live SSE stream (see doc comment above).
    refetchInterval: 15000,
  })
}

export interface ReplyVars {
  body: string
}

/** Post an agent reply, then refresh the message list — §9.10. */
export function useReply(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: ReplyVars) =>
      apiRequest<SupportMessage>('/support/threads/' + id + '/reply', {
        method: 'POST',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread', id, 'messages'] })
    },
  })
}

export interface UpdateThreadVars {
  status?: SupportThreadStatus
  assigneeAdminId?: string
  priority?: SupportPriority
}

/** Assign / set priority / resolve / close a thread — §9.10. */
export function useUpdateThread(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UpdateThreadVars) =>
      apiRequest<SupportThread>('/support/threads/' + id, {
        method: 'PATCH',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['thread', id] })
    },
  })
}
