import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DetailList,
  DetailRow,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatFinancialTimestamp, formatMoney, rupeesToPaise } from '@/shared/lib/format'
import type { Refund } from '@/shared/types/domain'
import { usePayment, useRefund } from './api'

type RefundMode = 'full' | 'partial'

export function PaymentDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const query = usePayment(id)
  const refund = useRefund(id)
  const canRefund = useCan('payment.refund')

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<RefundMode>('full')
  const [amountRupees, setAmountRupees] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const payment = query.data

  // Remaining refundable amount (paise) = original amount − already refunded.
  const refundedPaise = useMemo(
    () => (payment?.refunds ?? []).reduce((sum, r) => sum + r.amount, 0),
    [payment],
  )
  const remainingPaise = (payment?.amount ?? 0) - refundedPaise

  function openModal() {
    setMode('full')
    setAmountRupees(((remainingPaise > 0 ? remainingPaise : 0) / 100).toString())
    setReason('')
    setTouched(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  const enteredPaise =
    mode === 'full' ? remainingPaise : rupeesToPaise(Number(amountRupees) || 0)
  const amountInvalid =
    mode === 'partial' && (enteredPaise <= 0 || enteredPaise > remainingPaise)
  const reasonMissing = reason.trim().length === 0

  function handleConfirm() {
    setTouched(true)
    if (amountInvalid || reasonMissing) return
    refund.mutate(
      { amount: enteredPaise, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Refund issued', formatMoney(enteredPaise))
          closeModal()
        },
        onError: (e) => toastApiError(e, 'Refund failed'),
      },
    )
  }

  const refundColumns = useMemo<ColumnDef<Refund, unknown>[]>(
    () => [
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        id: 'reason',
        header: 'Reason',
        accessorKey: 'reason',
        cell: ({ row }) => row.original.reason,
      },
      {
        id: 'by',
        header: 'By',
        accessorKey: 'by',
        cell: ({ row }) => row.original.by ?? '—',
      },
      {
        id: 'at',
        header: 'At',
        accessorKey: 'at',
        cell: ({ row }) => formatFinancialTimestamp(row.original.at),
      },
    ],
    [],
  )

  if (query.isLoading) return <LoadingState />
  if (query.isError || !payment)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  return (
    <div className="space-y-4">
      <Link
        to="/payments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to payments
      </Link>

      <PageHeader
        title="Payment"
        description={payment.gatewayPaymentId ?? payment.id}
        actions={
          canRefund && remainingPaise > 0 ? (
            <Button onClick={openModal}>Issue refund</Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailRow label="Gateway">{payment.gateway}</DetailRow>
            <DetailRow label="Gateway payment id">
              <span className="font-mono text-xs">{payment.gatewayPaymentId ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Amount">{formatMoney(payment.amount)}</DetailRow>
            <DetailRow label="Refunded">{formatMoney(refundedPaise)}</DetailRow>
            <DetailRow label="Remaining">{formatMoney(remainingPaise)}</DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={payment.status} />
            </DetailRow>
            <DetailRow label="Booking">
              <Link to={`/bookings/${payment.bookingId}`} className="text-brand-700 hover:underline">
                {payment.bookingId}
              </Link>
            </DetailRow>
            <DetailRow label="Created">{formatFinancialTimestamp(payment.createdAt)}</DetailRow>
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refund history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={refundColumns}
            data={payment.refunds}
            emptyTitle="No refunds"
            emptyDescription="No refunds have been issued against this payment."
          />
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={closeModal}
        title="Issue refund"
        description={`Payment ${payment.gatewayPaymentId ?? payment.id}`}
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={refund.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirm}
              loading={refund.isPending}
              disabled={(amountInvalid || reasonMissing) && touched}
            >
              Refund {formatMoney(enteredPaise)}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Refund type">
            <Select
              value={mode}
              onChange={(e) => {
                const next = e.target.value as RefundMode
                setMode(next)
                if (next === 'full') setAmountRupees((remainingPaise / 100).toString())
              }}
            >
              <option value="full">Full ({formatMoney(remainingPaise)})</option>
              <option value="partial">Partial</option>
            </Select>
          </FormField>

          <FormField
            label="Amount (₹)"
            hint={`Maximum refundable: ${formatMoney(remainingPaise)}`}
            error={
              touched && amountInvalid
                ? 'Enter an amount greater than 0 and within the remaining refundable balance.'
                : undefined
            }
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={mode === 'full' ? (remainingPaise / 100).toString() : amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              disabled={mode === 'full'}
            />
          </FormField>

          <FormField
            label="Reason"
            required
            error={
              touched && reasonMissing
                ? 'A reason is required and will be recorded in the audit log.'
                : undefined
            }
          >
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why — this is written to the audit log."
            />
          </FormField>

          <p className="rounded-md bg-muted/50 p-3 text-sm">
            You are about to refund{' '}
            <span className="font-semibold">{formatMoney(enteredPaise)}</span> against payment{' '}
            <span className="font-mono text-xs">{payment.gatewayPaymentId ?? payment.id}</span>.
          </p>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            An Idempotency-Key is auto-generated so a retry won't double-refund.
          </p>
        </div>
      </Modal>
    </div>
  )
}
