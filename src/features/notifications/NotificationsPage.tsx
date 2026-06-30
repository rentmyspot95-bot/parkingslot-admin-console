import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  FormField,
  Input,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Textarea,
  toast,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useCan } from '@/shared/auth/useAuth'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import type { NotificationCampaign } from '@/shared/types/domain'
import { useCampaigns, useCreateCampaign, useSendCampaign, useTestSend } from './api'

// Deep-link types mirror the app's FCM payload `type` values so a tap routes
// to the right screen (design doc §9.11). Keep in sync with the mobile app.
const DEEP_LINK_TYPES = [
  'booking',
  'listing',
  'payment',
  'wallet',
  'support',
  'home',
  'review',
] as const

// Broad segments trigger an extra confirmation guardrail (rate-limited).
const SEGMENTS = [
  { value: 'all_users', label: 'All users', broad: true },
  { value: 'seekers', label: 'Seekers', broad: true },
  { value: 'owners', label: 'Owners', broad: true },
  { value: 'inactive_30d', label: 'Inactive 30d', broad: false },
] as const

const BROAD_SEGMENTS = SEGMENTS.filter((s) => s.broad).map((s) => s.value as string)

function audienceSummary(c: NotificationCampaign): string {
  if (c.audience.segment) return c.audience.segment.replace(/_/g, ' ')
  if (c.audience.userIds?.length) return `${c.audience.userIds.length} user(s)`
  return '—'
}

function Composer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canSend = useCan('notification.send')
  const create = useCreateCampaign()
  const testSend = useTestSend()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [deepLinkType, setDeepLinkType] = useState<string>(DEEP_LINK_TYPES[0])
  const [audienceMode, setAudienceMode] = useState<'segment' | 'userIds'>('segment')
  const [segment, setSegment] = useState<string>(SEGMENTS[0].value)
  const [userIdsRaw, setUserIdsRaw] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [deviceToken, setDeviceToken] = useState('')
  const [confirmBroad, setConfirmBroad] = useState(false)

  function buildAudience() {
    if (audienceMode === 'segment') return { segment, userIds: null }
    const ids = userIdsRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return { segment: null, userIds: ids }
  }

  function reset() {
    setTitle('')
    setBody('')
    setDeepLinkType(DEEP_LINK_TYPES[0])
    setAudienceMode('segment')
    setSegment(SEGMENTS[0].value)
    setUserIdsRaw('')
    setScheduledAt('')
    setDeviceToken('')
  }

  function close() {
    reset()
    onClose()
  }

  const isBroad = audienceMode === 'segment' && BROAD_SEGMENTS.includes(segment)
  const canSubmit = title.trim().length > 0 && body.trim().length > 0

  function saveDraft() {
    create.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        deepLinkType,
        audience: buildAudience(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success('Draft saved')
          close()
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function doTestSend() {
    if (!deviceToken.trim()) {
      toast.error('Enter a device token to test-send')
      return
    }
    testSend.mutate(
      { title: title.trim(), body: body.trim(), deepLinkType, deviceToken: deviceToken.trim() },
      {
        onSuccess: () => toast.success('Test push sent'),
        onError: (e) => toastApiError(e),
      },
    )
  }

  function sendNow() {
    if (isBroad) {
      setConfirmBroad(true)
      return
    }
    sendImmediately()
  }

  function sendImmediately() {
    // Persist then send: create returns the campaign, which the list re-fetches.
    create.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        deepLinkType,
        audience: buildAudience(),
        scheduledAt: null,
      },
      {
        onSuccess: () => {
          toast.success('Campaign saved — trigger send from the list')
          setConfirmBroad(false)
          close()
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <Drawer open={open} onClose={close} title="New campaign" subtitle="Compose an FCM push" width="lg">
      <div className="space-y-4">
        <FormField label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </FormField>
        <FormField label="Body" required>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body" />
        </FormField>
        <FormField label="Deep-link type" hint="Mirrors the app's FCM payload type so taps route correctly.">
          <Select value={deepLinkType} onChange={(e) => setDeepLinkType(e.target.value)}>
            {DEEP_LINK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Audience">
          <Select value={audienceMode} onChange={(e) => setAudienceMode(e.target.value as 'segment' | 'userIds')}>
            <option value="segment">Segment</option>
            <option value="userIds">Specific user IDs</option>
          </Select>
        </FormField>
        {audienceMode === 'segment' ? (
          <FormField label="Segment" hint={isBroad ? 'Broad audience — sending requires confirmation.' : undefined}>
            <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="User IDs" hint="Comma- or newline-separated user IDs.">
            <Textarea
              value={userIdsRaw}
              onChange={(e) => setUserIdsRaw(e.target.value)}
              placeholder="usr_1, usr_2, …"
            />
          </FormField>
        )}

        <FormField label="Schedule (optional)" hint="Leave empty to keep as a draft.">
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </FormField>

        <FormField label="Test-send device token" hint="Fire a single test push to verify rendering & deep link.">
          <div className="flex gap-2">
            <Input
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              placeholder="FCM device token"
            />
            <Button
              variant="outline"
              onClick={doTestSend}
              loading={testSend.isPending}
              disabled={!canSubmit}
            >
              Test send
            </Button>
          </div>
        </FormField>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={saveDraft} loading={create.isPending} disabled={!canSubmit}>
            Save draft
          </Button>
          {canSend && (
            <Button onClick={sendNow} loading={create.isPending} disabled={!canSubmit}>
              Send now
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmBroad}
        onClose={() => setConfirmBroad(false)}
        onConfirm={() => sendImmediately()}
        title="Send to a broad audience?"
        description="This targets a broad segment. Delivery is rate-limited and cannot be undone once dispatched."
        confirmLabel="Send to everyone"
        variant="danger"
        loading={create.isPending}
      />
    </Drawer>
  )
}

function SendButton({ campaign }: { campaign: NotificationCampaign }) {
  const send = useSendCampaign(campaign.id)
  const [confirm, setConfirm] = useState(false)
  const broad = !!campaign.audience.segment && BROAD_SEGMENTS.includes(campaign.audience.segment)
  const sendable = campaign.status === 'draft' || campaign.status === 'scheduled'
  if (!sendable) return <span className="text-xs text-muted-foreground">—</span>

  function run() {
    send.mutate(undefined, {
      onSuccess: () => {
        toast.success('Campaign sending')
        setConfirm(false)
      },
      onError: (e) => toastApiError(e),
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        loading={send.isPending}
        onClick={(e) => {
          e.stopPropagation()
          if (broad) setConfirm(true)
          else run()
        }}
      >
        Send now
      </Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => run()}
        title="Send to a broad audience?"
        description="This targets a broad segment. Delivery is rate-limited and cannot be undone once dispatched."
        confirmLabel="Send to everyone"
        variant="danger"
        loading={send.isPending}
      />
    </>
  )
}

export function NotificationsPage() {
  const canSend = useCan('notification.send')
  const { state, apiParams, setPage } = useListParams()
  const query = useCampaigns(apiParams)
  const [composerOpen, setComposerOpen] = useState(false)

  const columns = useMemo<ColumnDef<NotificationCampaign, unknown>[]>(
    () => [
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'audience',
        header: 'Audience',
        cell: ({ row }) => audienceSummary(row.original),
      },
      {
        id: 'sentCount',
        header: 'Sent',
        cell: ({ row }) => formatNumber(row.original.sentCount),
      },
      {
        id: 'scheduledAt',
        header: 'Scheduled',
        cell: ({ row }) =>
          row.original.scheduledAt ? formatDateTime(row.original.scheduledAt) : '—',
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        sortKey: 'createdAt',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      } as ColumnDef<NotificationCampaign, unknown>,
      ...(canSend
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: NotificationCampaign } }) => (
                <SendButton campaign={row.original} />
              ),
            } as ColumnDef<NotificationCampaign, unknown>,
          ]
        : []),
    ],
    [canSend],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Compose and send type-routed FCM push campaigns."
        actions={<Button onClick={() => setComposerOpen(true)}>New campaign</Button>}
      />
      <DataTable
        columns={columns}
        data={query.data?.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No campaigns"
      />
      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
      <Composer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
