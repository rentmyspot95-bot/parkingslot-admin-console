import { useMemo, useState } from 'react'
import { KeyRound } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailRow,
  Drawer,
  FilterSelect,
  FormField,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  Toolbar,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatDate, formatFinancialTimestamp, formatMoney } from '@/shared/lib/format'
import type { Payout } from '@/shared/types/domain'
import {
  useHoldPayout,
  usePayout,
  usePayouts,
  useRunPayout,
  useTriggerPayout,
} from './api'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'on_hold', label: 'On hold' },
]

/** A payout may include its constituent bookings when fetched as a detail. */
interface PayoutBookingLine {
  id: string
  amount: number
  commission: number
  netToHost: number
}
type PayoutDetail = Payout & { bookings?: PayoutBookingLine[] | null }

export function PayoutsPage() {
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status'],
  })

  const canTrigger = useCan('payout.trigger')
  const canHold = useCan('payout.hold')

  const query = usePayouts(apiParams)

  // Generate payout run
  const [runOpen, setRunOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const runPayout = useRunPayout()

  // Drawer (row detail)
  const [selected, setSelected] = useState<Payout | null>(null)
  const detail = usePayout(selected?.id ?? '')
  const payout = (detail.data ?? selected) as PayoutDetail | null

  // Per-payout actions act on `selected`.
  const triggerPayout = useTriggerPayout(selected?.id ?? '')
  const holdPayout = useHoldPayout(selected?.id ?? '')

  type DialogKind = 'trigger' | 'hold' | 'release' | null
  const [dialog, setDialog] = useState<DialogKind>(null)

  function runConfirm() {
    if (!from || !to) return
    runPayout.mutate(
      { from, to },
      {
        onSuccess: () => {
          toast.success('Payout run generated', `${formatDate(from)} – ${formatDate(to)}`)
          setRunOpen(false)
          setFrom('')
          setTo('')
        },
        onError: (e) => toastApiError(e, 'Could not generate payout run'),
      },
    )
  }

  function confirmTrigger() {
    if (!selected) return
    triggerPayout.mutate(undefined, {
      onSuccess: () => {
        toast.success('Payout triggered', formatMoney(selected.netPayable))
        setDialog(null)
      },
      onError: (e) => toastApiError(e, 'Could not trigger payout'),
    })
  }

  function confirmHold(reason: string, hold: boolean) {
    if (!selected) return
    holdPayout.mutate(
      { hold, reason },
      {
        onSuccess: () => {
          toast.success(hold ? 'Payout placed on hold' : 'Hold released')
          setDialog(null)
        },
        onError: (e) => toastApiError(e, 'Could not update hold'),
      },
    )
  }

  const columns = useMemo<ColumnDef<Payout, unknown>[]>(
    () => [
      {
        id: 'hostName',
        header: 'Host',
        accessorKey: 'hostName',
        cell: ({ row }) => row.original.hostName ?? row.original.hostId,
      },
      {
        id: 'period',
        header: 'Period',
        accessorKey: 'period',
        cell: ({ row }) =>
          `${formatDate(row.original.period.from)} – ${formatDate(row.original.period.to)}`,
      },
      {
        id: 'grossEarnings',
        header: 'Gross',
        accessorKey: 'grossEarnings',
        cell: ({ row }) => formatMoney(row.original.grossEarnings),
      },
      {
        id: 'commission',
        header: 'Commission',
        accessorKey: 'commission',
        cell: ({ row }) => formatMoney(row.original.commission),
      },
      {
        id: 'netPayable',
        header: 'Net payable',
        accessorKey: 'netPayable',
        sortKey: 'netPayable',
        cell: ({ row }) => formatMoney(row.original.netPayable),
      } as ColumnDef<Payout, unknown>,
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'method',
        header: 'Method',
        accessorKey: 'method',
        cell: ({ row }) => row.original.method ?? '—',
      },
      {
        id: 'paidAt',
        header: 'Paid',
        accessorKey: 'paidAt',
        sortKey: 'paidAt',
        cell: ({ row }) => (row.original.paidAt ? formatDate(row.original.paidAt) : '—'),
      } as ColumnDef<Payout, unknown>,
    ],
    [],
  )

  const isOnHold = payout?.status === 'on_hold'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payouts"
        description="Settle host earnings net of commission."
        actions={
          canTrigger ? (
            <Button onClick={() => setRunOpen(true)}>Generate payout run</Button>
          ) : undefined
        }
      />

      <Toolbar>
        <SearchInput value={state.q} onChange={setQuery} placeholder="Search by host…" />
        <FilterSelect
          label="Status"
          value={state.filters.status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        data={query.data?.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        sort={state.sort}
        onSortChange={setSort}
        onRowClick={(row) => setSelected(row)}
        emptyTitle="No payouts found"
        emptyDescription="No payouts match the current filters."
      />

      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />

      {/* Generate payout run */}
      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Generate payout run"
        description="Settle host earnings for a closed period."
        footer={
          <>
            <Button variant="outline" onClick={() => setRunOpen(false)} disabled={runPayout.isPending}>
              Cancel
            </Button>
            <Button onClick={runConfirm} loading={runPayout.isPending} disabled={!from || !to}>
              Generate run
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            An Idempotency-Key is auto-generated so a retried run won't duplicate.
          </p>
        </div>
      </Modal>

      {/* Per-payout detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={payout?.hostName ?? payout?.hostId ?? 'Payout'}
        subtitle={
          payout
            ? `${formatDate(payout.period.from)} – ${formatDate(payout.period.to)}`
            : undefined
        }
      >
        {payout && (
          <div className="space-y-4">
            <DetailList>
              <DetailRow label="Status">
                <StatusBadge status={payout.status} />
              </DetailRow>
              <DetailRow label="Gross earnings">{formatMoney(payout.grossEarnings)}</DetailRow>
              <DetailRow label="Commission">{formatMoney(payout.commission)}</DetailRow>
              <DetailRow label="Net payable">{formatMoney(payout.netPayable)}</DetailRow>
              <DetailRow label="Method">{payout.method ?? '—'}</DetailRow>
              <DetailRow label="Reference">{payout.reference ?? '—'}</DetailRow>
              <DetailRow label="Paid at">
                {payout.paidAt ? formatFinancialTimestamp(payout.paidAt) : '—'}
              </DetailRow>
            </DetailList>

            {payout.bookings && payout.bookings.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Constituent bookings</p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Booking</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Commission</th>
                        <th className="px-3 py-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payout.bookings.map((b) => (
                        <tr key={b.id} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs">{b.id}</td>
                          <td className="px-3 py-2">{formatMoney(b.amount)}</td>
                          <td className="px-3 py-2">{formatMoney(b.commission)}</td>
                          <td className="px-3 py-2">{formatMoney(b.netToHost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {canTrigger && payout.status !== 'paid' && payout.status !== 'on_hold' && (
                <Button onClick={() => setDialog('trigger')}>Trigger payout</Button>
              )}
              {canTrigger && payout.status === 'failed' && (
                <Button variant="secondary" onClick={() => setDialog('trigger')}>
                  Retry failed
                </Button>
              )}
              {canHold &&
                (isOnHold ? (
                  <Button variant="outline" onClick={() => setDialog('release')}>
                    Release hold
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setDialog('hold')}>
                    Place hold
                  </Button>
                ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* Trigger / retry confirmation (money, irreversible) */}
      <ConfirmDialog
        open={dialog === 'trigger'}
        onClose={() => setDialog(null)}
        onConfirm={confirmTrigger}
        title="Trigger payout"
        description={
          selected
            ? `Pay ${selected.hostName ?? selected.hostId} ${formatMoney(selected.netPayable)}. This moves money and cannot be undone.`
            : undefined
        }
        confirmLabel="Trigger payout"
        variant="danger"
        loading={triggerPayout.isPending}
      >
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" />
          An Idempotency-Key is auto-generated so a retry won't double-pay.
        </p>
      </ConfirmDialog>

      {/* Place hold (reason required) */}
      <ConfirmDialog
        open={dialog === 'hold'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => confirmHold(reason, true)}
        title="Place payout on hold"
        description={
          selected
            ? `Hold the payout to ${selected.hostName ?? selected.hostId} (${formatMoney(selected.netPayable)}).`
            : undefined
        }
        confirmLabel="Place hold"
        variant="danger"
        requireReason
        loading={holdPayout.isPending}
      />

      {/* Release hold (reason required) */}
      <ConfirmDialog
        open={dialog === 'release'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => confirmHold(reason, false)}
        title="Release payout hold"
        description={
          selected
            ? `Release the hold on the payout to ${selected.hostName ?? selected.hostId}.`
            : undefined
        }
        confirmLabel="Release hold"
        requireReason
        loading={holdPayout.isPending}
      />
    </div>
  )
}
