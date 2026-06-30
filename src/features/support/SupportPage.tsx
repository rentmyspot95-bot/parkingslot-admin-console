import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  FilterSelect,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  Toolbar,
  toast,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useCan } from '@/shared/auth/useAuth'
import { cn } from '@/shared/lib/cn'
import { formatDateTime, formatRelative } from '@/shared/lib/format'
import type {
  SupportMessage,
  SupportPriority,
  SupportThread,
} from '@/shared/types/domain'
import { useReply, useThread, useThreadMessages, useThreads, useUpdateThread } from './api'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const PRIORITY_VALUES: SupportPriority[] = ['low', 'normal', 'high', 'urgent']

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: SupportThread
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
        active && 'bg-brand-50/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{thread.subject}</span>
        <StatusBadge status={thread.status} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{thread.userName ?? thread.userId}</span>
        <span className="shrink-0 capitalize">{thread.priority}</span>
      </div>
      {thread.lastMessageAt && (
        <span className="text-xs text-muted-foreground">{formatRelative(thread.lastMessageAt)}</span>
      )}
    </button>
  )
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const { senderType } = message
  const isAgent = senderType === 'agent'
  const isSystem = senderType === 'system'
  if (isSystem) {
    return (
      <div className="my-1 text-center text-xs italic text-muted-foreground">{message.body}</div>
    )
  }
  return (
    <div className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm',
          isAgent ? 'bg-brand-600 text-white' : 'bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={cn(
            'mt-1 text-[10px]',
            isAgent ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          {message.senderName ?? senderType} · {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

function Conversation({ threadId }: { threadId: string }) {
  const canReply = useCan('support.reply')
  const canAssign = useCan('support.assign')
  const thread = useThread(threadId)
  // Production reads messages off the SSE stream endpoint
  // (`GET /admin/support/threads/:id/stream`). Here we poll instead.
  const messages = useThreadMessages(threadId)
  const reply = useReply(threadId)
  const update = useUpdateThread(threadId)
  const [draft, setDraft] = useState('')

  function sendReply() {
    const body = draft.trim()
    if (!body) return
    reply.mutate(
      { body },
      {
        onSuccess: () => {
          setDraft('')
          toast.success('Reply sent')
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function patch(vars: Parameters<typeof update.mutate>[0], okMsg: string) {
    update.mutate(vars, {
      onSuccess: () => toast.success(okMsg),
      onError: (e) => toastApiError(e),
    })
  }

  if (thread.isLoading) return <LoadingState />
  if (thread.isError) return <ErrorState error={thread.error} onRetry={() => thread.refetch()} />
  const t = thread.data!

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t.subject}</CardTitle>
          <StatusBadge status={t.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={t.priority}
            disabled={!canReply || update.isPending}
            onChange={(e) => patch({ priority: e.target.value as SupportPriority }, 'Priority updated')}
            className="h-8 w-36"
          >
            {PRIORITY_VALUES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          {canAssign && (
            <Button
              variant="outline"
              size="sm"
              loading={update.isPending}
              onClick={() => patch({ assigneeAdminId: 'me' }, 'Assigned to you')}
            >
              Assign to me
            </Button>
          )}
          {canReply && (
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={update.isPending}
                onClick={() => patch({ status: 'resolved' }, 'Thread resolved')}
              >
                Resolve
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={update.isPending}
                onClick={() => patch({ status: 'closed' }, 'Thread closed')}
              >
                Close
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          User context: {t.userName ?? t.userId}
          {t.assigneeName ? ` · assigned to ${t.assigneeName}` : ''}
          {t.category ? ` · ${t.category}` : ''}
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
          {messages.isLoading ? (
            <LoadingState />
          ) : messages.isError ? (
            <ErrorState error={messages.error} onRetry={() => messages.refetch()} />
          ) : (messages.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.data!.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>
        {canReply ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a reply to the user…"
            />
            <div className="flex justify-end">
              <Button onClick={sendReply} loading={reply.isPending} disabled={!draft.trim()}>
                <Send className="mr-1.5 h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            You have read-only access to this thread.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function SupportPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { state, apiParams, setFilter } = useListParams({ filterKeys: ['status', 'priority'] })

  const threads = useThreads(apiParams)
  const list = useMemo(() => threads.data?.data ?? [], [threads.data])

  // Use the :id route param if present, else fall back to the first thread.
  const selectedId = id ?? list[0]?.id

  return (
    <div className="space-y-4">
      <PageHeader title="Support" description="Agent side of the in-app support chat." />
      <Toolbar>
        <FilterSelect
          label="Status"
          value={state.filters.status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Priority"
          value={state.filters.priority ?? ''}
          onChange={(v) => setFilter('priority', v)}
          options={PRIORITY_OPTIONS}
        />
      </Toolbar>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex h-[70vh] flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.isLoading ? (
              <LoadingState />
            ) : threads.isError ? (
              <ErrorState error={threads.error} onRetry={() => threads.refetch()} />
            ) : list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No threads.</p>
            ) : (
              list.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  active={thread.id === selectedId}
                  onClick={() => navigate(`/support/${thread.id}`)}
                />
              ))
            )}
          </div>
        </Card>

        <div className="h-[70vh]">
          {selectedId ? (
            <Conversation threadId={selectedId} />
          ) : (
            <Card className="flex h-full items-center justify-center">
              <CardContent className="text-sm text-muted-foreground">
                Select a thread to view the conversation.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
