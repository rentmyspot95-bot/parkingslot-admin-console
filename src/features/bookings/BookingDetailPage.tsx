import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DetailList,
  DetailRow,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatCountdown, formatDateTime, formatMoney } from '@/shared/lib/format'
import { BOOKING_MODE_LABELS, VEHICLE_TYPE_LABELS } from '@/shared/types/common'
import type { Booking } from '@/shared/types/domain'
import {
  useBooking,
  useCancelBooking,
  useExtendDeadline,
  useOwnerDecision,
  useResolveDispute,
} from './api'

interface TimelineStep {
  label: string
  detail?: string
  state: 'done' | 'current' | 'rejected' | 'pending'
}

function buildTimeline(b: Booking): TimelineStep[] {
  const steps: TimelineStep[] = []
  steps.push({ label: 'Requested', detail: formatDateTime(b.createdAt), state: 'done' })

  if (b.bookingMode === 'request_to_book') {
    const decided = b.decidedAt ? formatDateTime(b.decidedAt) : undefined
    if (b.ownerDecision === 'rejected' || b.status === 'rejected') {
      steps.push({
        label: 'Owner rejected',
        detail: b.ownerRejectReason ?? decided,
        state: 'rejected',
      })
    } else if (b.autoRejected || b.status === 'auto_rejected') {
      steps.push({
        label: 'Auto-rejected (deadline passed)',
        detail: decided,
        state: 'rejected',
      })
    } else if (b.ownerDecision === 'approved') {
      steps.push({ label: 'Owner approved', detail: decided, state: 'done' })
    } else {
      steps.push({
        label: 'Pending owner approval',
        detail: b.responseDeadline ? formatCountdown(b.responseDeadline).label : undefined,
        state: b.status === 'pending_owner_approval' ? 'current' : 'pending',
      })
    }
  }

  if (b.status === 'cancelled') {
    steps.push({
      label: 'Cancelled',
      detail: b.cancelReason ?? (b.cancelledBy ? `by ${b.cancelledBy}` : undefined),
      state: 'rejected',
    })
    return steps
  }
  if (b.status === 'expired') {
    steps.push({ label: 'Expired', state: 'rejected' })
    return steps
  }

  const flow: { key: Booking['status']; label: string }[] = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ]
  const order: Booking['status'][] = ['confirmed', 'active', 'completed']
  const currentIdx = order.indexOf(b.status)
  for (const [i, step] of flow.entries()) {
    let s: TimelineStep['state'] = 'pending'
    if (currentIdx >= 0) {
      if (i < currentIdx) s = 'done'
      else if (i === currentIdx) s = 'current'
    }
    steps.push({ label: step.label, state: s })
  }
  if (b.status === 'disputed') {
    steps.push({ label: 'Disputed', state: 'current' })
  }
  return steps
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  const dotTone: Record<TimelineStep['state'], string> = {
    done: 'bg-green-500 border-green-500',
    current: 'bg-brand-600 border-brand-600',
    rejected: 'bg-red-500 border-red-500',
    pending: 'bg-card border-border',
  }
  return (
    <ol className="relative ml-2 space-y-4 border-l border-border pl-5">
      {steps.map((step, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[1.625rem] top-1 h-3 w-3 rounded-full border-2 ${dotTone[step.state]}`}
            aria-hidden
          />
          <p
            className={
              step.state === 'pending'
                ? 'text-sm text-muted-foreground'
                : 'text-sm font-medium'
            }
          >
            {step.label}
          </p>
          {step.detail && <p className="text-xs text-muted-foreground">{step.detail}</p>}
        </li>
      ))}
    </ol>
  )
}

export function BookingDetailPage() {
  const { id = '' } = useParams()
  const query = useBooking(id)
  const canCancel = useCan('booking.cancel')
  const canOverride = useCan('booking.override')

  const cancelM = useCancelBooking(id)
  const decisionM = useOwnerDecision(id)
  const extendM = useExtendDeadline(id)
  const resolveM = useResolveDispute(id)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [alsoRefund, setAlsoRefund] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState('30')
  const [resolveOpen, setResolveOpen] = useState(false)

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }

  const b = query.data
  const isRequestToBook = b.bookingMode === 'request_to_book'
  const isPendingApproval = b.status === 'pending_owner_approval'

  function handleCancel(reason: string) {
    cancelM.mutate(
      { reason, refund: alsoRefund },
      {
        onSuccess: () => {
          toast.success('Booking cancelled', alsoRefund ? 'Refund initiated.' : undefined)
          setCancelOpen(false)
          setAlsoRefund(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleApprove(reason: string) {
    decisionM.mutate(
      { decision: 'approved', reason: reason || undefined, onBehalfOfOwner: true },
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

  function handleExtend() {
    const minutes = Number(extendMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error('Enter a valid number of minutes')
      return
    }
    extendM.mutate(
      { minutes },
      {
        onSuccess: () => {
          toast.success('Deadline extended', `+${minutes} minutes`)
          setExtendOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleResolveDispute(reason: string) {
    resolveM.mutate(
      { reason },
      {
        onSuccess: () => {
          toast.success('Dispute marked resolved')
          setResolveOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <PageHeader
        title={`Booking ${b.id}`}
        description={`${BOOKING_MODE_LABELS[b.bookingMode]} · ${b.listingTitle ?? 'Listing'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <Link to="/support" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Contact seeker
            </Link>
            <Link to="/support" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Contact host
            </Link>
            {b.status === 'disputed' && canCancel && (
              <Button variant="primary" size="sm" onClick={() => setResolveOpen(true)}>
                Mark dispute resolved
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                Admin-cancel
              </Button>
            )}
          </div>
        }
      />

      {isPendingApproval && canOverride && (
        <Card>
          <CardHeader>
            <CardTitle>Owner-approval override</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => setApproveOpen(true)}>
              Force-approve
            </Button>
            <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
              Force-reject
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)}>
              Extend deadline
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline steps={buildTimeline(b)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Seeker">
                <Link className="text-brand-700 hover:underline" to={`/users/${b.seekerId}`}>
                  {b.seekerName ?? b.seekerId}
                </Link>
              </DetailRow>
              <DetailRow label="Host">
                <Link className="text-brand-700 hover:underline" to={`/hosts/${b.hostId}`}>
                  {b.hostName ?? b.hostId}
                </Link>
              </DetailRow>
              <DetailRow label="Listing">
                <Link className="text-brand-700 hover:underline" to={`/listings/${b.listingId}`}>
                  {b.listingTitle ?? b.listingId}
                </Link>
              </DetailRow>
            </DetailList>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Slot &amp; amount</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Slot">
                {formatDateTime(b.slot.start)} → {formatDateTime(b.slot.end)}
              </DetailRow>
              <DetailRow label="Bay">{b.bayId ?? '—'}</DetailRow>
              <DetailRow label="Vehicle">{VEHICLE_TYPE_LABELS[b.vehicleType]}</DetailRow>
              <DetailRow label="Amount">{formatMoney(b.amount)}</DetailRow>
              <DetailRow label="Commission">{formatMoney(b.commission)}</DetailRow>
              <DetailRow label="Net to host">{formatMoney(b.netToHost)}</DetailRow>
              <DetailRow label="Payment">
                {b.paymentId ? (
                  <Link className="text-brand-700 hover:underline" to={`/payments/${b.paymentId}`}>
                    {b.paymentId}
                  </Link>
                ) : (
                  '—'
                )}
              </DetailRow>
            </DetailList>
          </CardContent>
        </Card>
      </div>

      {isRequestToBook && (
        <Card>
          <CardHeader>
            <CardTitle>Owner approval</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Decision">
                {b.ownerDecision ? (
                  <Badge tone={b.ownerDecision === 'approved' ? 'green' : 'red'}>
                    {b.ownerDecision}
                  </Badge>
                ) : (
                  <Badge tone="amber">awaiting</Badge>
                )}
              </DetailRow>
              <DetailRow label="Reject reason">{b.ownerRejectReason ?? '—'}</DetailRow>
              <DetailRow label="Response deadline">
                {b.responseDeadline ? (
                  (() => {
                    const c = formatCountdown(b.responseDeadline)
                    return (
                      <Badge tone={c.expired ? 'red' : c.urgent ? 'amber' : 'neutral'}>
                        {c.label}
                      </Badge>
                    )
                  })()
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Decided at">
                {b.decidedAt ? formatDateTime(b.decidedAt) : '—'}
              </DetailRow>
              <DetailRow label="Auto-rejected">{b.autoRejected ? 'Yes' : 'No'}</DetailRow>
            </DetailList>
          </CardContent>
        </Card>
      )}

      {/* Admin-cancel with optional refund */}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => {
          setCancelOpen(false)
          setAlsoRefund(false)
        }}
        onConfirm={handleCancel}
        title="Admin-cancel booking"
        description={`Cancel booking ${b.id} (${formatMoney(b.amount)}). This is audited.`}
        confirmLabel="Cancel booking"
        variant="danger"
        requireReason
        loading={cancelM.isPending}
      >
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alsoRefund}
            onChange={(e) => setAlsoRefund(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Also refund the seeker
        </label>
      </ConfirmDialog>

      {/* Mark dispute resolved */}
      <ConfirmDialog
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onConfirm={handleResolveDispute}
        title="Mark dispute resolved"
        description="Record the resolution. This is written to the audit log."
        confirmLabel="Mark resolved"
        variant="primary"
        requireReason
        loading={resolveM.isPending}
      />

      {/* Force-approve */}
      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        title="Force-approve request"
        description="Approve this request on the owner's behalf. This is audited."
        confirmLabel="Force-approve"
        variant="primary"
        loading={decisionM.isPending}
      />

      {/* Force-reject */}
      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        title="Force-reject request"
        description="Reject this request on the owner's behalf. This is audited."
        confirmLabel="Force-reject"
        variant="danger"
        requireReason
        loading={decisionM.isPending}
      />

      {/* Extend deadline */}
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
          <Input
            type="number"
            min={1}
            value={extendMinutes}
            onChange={(e) => setExtendMinutes(e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  )
}
