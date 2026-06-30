import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Clock, Flag, X } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  Tabs,
  Toolbar,
  toast,
} from '@/shared/ui'
import { fetchList } from '@/shared/api/list'
import { apiRequest } from '@/shared/api/client'
import { useCan, useCanAny } from '@/shared/auth/useAuth'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatCountdown, formatDateTime, formatMoney } from '@/shared/lib/format'
import type { Booking } from '@/shared/types/domain'
import { useCancelBooking, useExtendDeadline, useOwnerDecision } from './api'

type Tab = 'pending' | 'log'

function CountdownBadge({ deadline }: { deadline?: string | null }) {
  if (!deadline) return <span className="text-muted-foreground">—</span>
  const c = formatCountdown(deadline)
  return (
    <Badge tone={c.expired ? 'red' : c.urgent ? 'amber' : 'neutral'}>{c.label}</Badge>
  )
}

/** Per-row action bar — its own component so each row owns its mutation hooks. */
function PendingRowActions({ booking }: { booking: Booking }) {
  const canOverride = useCan('booking.override')
  const canCancel = useCan('booking.cancel')

  const decisionM = useOwnerDecision(booking.id)
  const extendM = useExtendDeadline(booking.id)
  const cancelM = useCancelBooking(booking.id)

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [minutes, setMinutes] = useState('30')

  if (!canOverride && !canCancel) return null

  function handleApprove() {
    decisionM.mutate(
      { decision: 'approved', onBehalfOfOwner: true },
      {
        onSuccess: () => {
          toast.success('Request force-approved')
          setApproveOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleReject(reason: string) {
    decisionM.mutate(
      { decision: 'rejected', reason, onBehalfOfOwner: true },
      {
        onSuccess: () => {
          toast.success('Request force-rejected')
          setRejectOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleCancel(reason: string) {
    cancelM.mutate(
      { reason, refund: true },
      {
        onSuccess: () => {
          toast.success('Cancelled + refunded')
          setCancelOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleExtend() {
    const m = Number(minutes)
    if (!Number.isFinite(m) || m <= 0) {
      toast.error('Enter a valid number of minutes')
      return
    }
    extendM.mutate(
      { minutes: m },
      {
        onSuccess: () => {
          toast.success('Deadline extended', `+${m} minutes`)
          setExtendOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canOverride && (
        <>
          <Button
            variant="ghost"
            size="icon"
            title="Force-approve"
            onClick={() => setApproveOpen(true)}
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Force-reject"
            onClick={() => setRejectOpen(true)}
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Extend deadline"
            onClick={() => setExtendOpen(true)}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </>
      )}
      {canCancel && (
        <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
          Cancel + refund
        </Button>
      )}

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        title="Force-approve request"
        description="Approve on the owner's behalf. This is audited."
        confirmLabel="Force-approve"
        variant="primary"
        loading={decisionM.isPending}
      />
      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        title="Force-reject request"
        description="Reject on the owner's behalf. This is audited."
        confirmLabel="Force-reject"
        variant="danger"
        requireReason
        loading={decisionM.isPending}
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel + refund"
        description={`Cancel booking ${booking.id} (${formatMoney(booking.amount)}) and refund the seeker.`}
        confirmLabel="Cancel + refund"
        variant="danger"
        requireReason
        loading={cancelM.isPending}
      />
      <Modal
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Extend response window"
        description="Push the owner-approval deadline forward."
        footer={
          <>
            <Button variant="outline" onClick={() => setExtendOpen(false)} disabled={extendM.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExtend} loading={extendM.isPending}>
              Extend
            </Button>
          </>
        }
      >
        <FormField label="Minutes" required>
          <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </FormField>
      </Modal>
    </div>
  )
}

/** Flag-owner action for the log tab. */
function FlagOwnerButton({ booking }: { booking: Booking }) {
  const canFlag = useCanAny(['host.suspend', 'booking.override'])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!canFlag) return null

  async function handleFlag(reason: string) {
    setLoading(true)
    try {
      await apiRequest('/hosts/' + booking.hostId + '/flag', {
        method: 'POST',
        body: { reason },
      })
      toast.success('Owner flagged', booking.hostName ?? booking.hostId)
      setOpen(false)
    } catch (e) {
      toastApiError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" /> Flag owner
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleFlag}
        title="Flag owner"
        description={`Flag ${booking.hostName ?? booking.hostId} for chronic non-response / high rejection. Feeds Trust & Safety.`}
        confirmLabel="Flag owner"
        variant="danger"
        requireReason
        loading={loading}
      />
    </div>
  )
}

export function BookingRequestsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')

  const pendingQuery = useQuery({
    queryKey: ['bookings', { status: 'pending_owner_approval', sort: 'responseDeadline' }],
    queryFn: ({ signal }) =>
      fetchList<Booking>(
        '/bookings',
        { status: 'pending_owner_approval', sort: 'responseDeadline', limit: 50 },
        signal,
      ),
  })

  const { state, apiParams, setPage, setSort } = useListParams({
    sort: '-decidedAt',
    filterKeys: ['status'],
  })
  const logQuery = useQuery({
    queryKey: ['bookings', 'log', apiParams],
    queryFn: ({ signal }) =>
      fetchList<Booking>(
        '/bookings',
        { ...apiParams, status: apiParams.status || 'auto_rejected' },
        signal,
      ),
    enabled: tab === 'log',
  })

  const pendingColumns = useMemo<ColumnDef<Booking, unknown>[]>(
    () => [
      {
        id: 'listingTitle',
        header: 'Listing',
        cell: ({ row }) => row.original.listingTitle ?? '—',
      },
      {
        id: 'seekerName',
        header: 'Seeker',
        cell: ({ row }) => row.original.seekerName ?? '—',
      },
      {
        id: 'hostName',
        header: 'Host',
        cell: ({ row }) => row.original.hostName ?? '—',
      },
      {
        id: 'slot',
        header: 'Slot',
        cell: ({ row }) => formatDateTime(row.original.slot.start),
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        id: 'countdown',
        header: 'Auto-reject in',
        cell: ({ row }) => <CountdownBadge deadline={row.original.responseDeadline} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <PendingRowActions booking={row.original} />,
      },
    ],
    [],
  )

  const logColumns = useMemo<ColumnDef<Booking, unknown>[]>(
    () => [
      {
        id: 'listingTitle',
        header: 'Listing',
        cell: ({ row }) => row.original.listingTitle ?? '—',
      },
      {
        id: 'hostName',
        header: 'Host',
        cell: ({ row }) => row.original.hostName ?? '—',
      },
      {
        id: 'seekerName',
        header: 'Seeker',
        cell: ({ row }) => row.original.seekerName ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) =>
          row.original.ownerRejectReason ??
          (row.original.autoRejected ? 'No owner response (auto)' : '—'),
      },
      {
        id: 'decidedAt',
        header: 'Decided',
        accessorKey: 'decidedAt',
        sortKey: 'decidedAt',
        cell: ({ row }) =>
          row.original.decidedAt ? formatDateTime(row.original.decidedAt) : '—',
      } as ColumnDef<Booking, unknown>,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <FlagOwnerButton booking={row.original} />,
      },
    ],
    [],
  )

  const pendingCount = pendingQuery.data?.total ?? pendingQuery.data?.data.length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Owner-approval requests"
        description="Oversee the request-to-book flow: intervene before requests auto-reject."
      />

      <Tabs
        tabs={[
          { value: 'pending', label: 'Pending approval', count: pendingCount },
          { value: 'log', label: 'Auto-reject / rejection log' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {tab === 'pending' ? (
        <DataTable
          columns={pendingColumns}
          data={pendingQuery.data?.data}
          loading={pendingQuery.isLoading}
          error={pendingQuery.error}
          onRetry={() => pendingQuery.refetch()}
          onRowClick={(row) => navigate(`/bookings/${row.id}`)}
          emptyTitle="No pending requests"
          emptyDescription="Every request-to-book booking has been actioned."
        />
      ) : (
        <>
          <Toolbar>
            <span className="text-sm text-muted-foreground">
              Recently auto-rejected and owner-rejected requests — spot chronic non-responders.
            </span>
          </Toolbar>
          <DataTable
            columns={logColumns}
            data={logQuery.data?.data}
            loading={logQuery.isLoading}
            error={logQuery.error}
            onRetry={() => logQuery.refetch()}
            sort={state.sort}
            onSortChange={setSort}
            onRowClick={(row) => navigate(`/bookings/${row.id}`)}
            emptyTitle="No rejections logged"
          />
          <Pagination
            page={state.page}
            limit={state.limit}
            total={logQuery.data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
