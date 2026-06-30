import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  toast,
} from '@/shared/ui'
import { apiRequest } from '@/shared/api/client'
import { fetchList } from '@/shared/api/list'
import { useCan, useCanAny } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { CAPPED_WALLET_LIMIT_PAISE } from '@/shared/auth/permissions'
import { formatDateTime, formatMoney, formatNumber, rupeesToPaise } from '@/shared/lib/format'
import type { WalletTransaction } from '@/shared/types/domain'

type AdjustType = 'credit' | 'debit' | 'adjustment'

const ADJUST_TYPES: { value: AdjustType; label: string }[] = [
  { value: 'credit', label: 'Credit (add)' },
  { value: 'debit', label: 'Debit / clawback' },
  { value: 'adjustment', label: 'Adjustment' },
]

const TABS = [
  { value: 'ledger', label: 'User ledger' },
  { value: 'bulk', label: 'Bulk credit' },
]

export function WalletPage() {
  const [tab, setTab] = useState('ledger')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Wallet & Credits"
        description="Administer the credits-only wallet — per-user ledger and bulk issuance."
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'ledger' ? <UserLedgerTab /> : <BulkCreditTab />}
    </div>
  )
}

function UserLedgerTab() {
  const qc = useQueryClient()
  const [userInput, setUserInput] = useState('')
  const [activeId, setActiveId] = useState('')

  const canAdjust = useCan('wallet.adjust')
  const canCapped = useCanAny(['wallet.adjust:capped'])
  const cappedOnly = !canAdjust && canCapped
  const canAdjustAny = canAdjust || canCapped

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('credit')
  const [adjustRupees, setAdjustRupees] = useState('')

  const ledger = useQuery({
    queryKey: ['user', activeId, 'wallet', 'ledger100'],
    queryFn: ({ signal }) =>
      fetchList<WalletTransaction>('/users/' + activeId + '/wallet', { limit: 100 }, signal),
    enabled: !!activeId,
  })

  const adjust = useMutation({
    mutationFn: (vars: { type: AdjustType; amount: number; reason: string }) =>
      apiRequest<WalletTransaction>('/users/' + activeId + '/wallet-adjust', {
        method: 'POST',
        body: vars,
        idempotent: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', activeId, 'wallet', 'ledger100'] })
    },
  })

  const balance = ledger.data?.data?.[0]?.balanceAfter

  const columns = useMemo<ColumnDef<WalletTransaction, unknown>[]>(
    () => [
      {
        id: 'createdAt',
        header: 'Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => <StatusBadge status={row.original.type} />,
      },
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
        id: 'balanceAfter',
        header: 'Balance',
        accessorKey: 'balanceAfter',
        cell: ({ row }) => formatMoney(row.original.balanceAfter),
      },
    ],
    [],
  )

  function load() {
    setActiveId(userInput.trim())
  }

  function handleAdjust(reason: string) {
    const rupees = Number(adjustRupees)
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error('Enter a valid amount in rupees')
      return
    }
    const amount = rupeesToPaise(rupees)
    if (cappedOnly && amount > CAPPED_WALLET_LIMIT_PAISE) {
      toast.error(
        'Amount exceeds your cap',
        `Capped to ${formatMoney(CAPPED_WALLET_LIMIT_PAISE)} per transaction.`,
      )
      return
    }
    adjust.mutate(
      { type: adjustType, amount, reason },
      {
        onSuccess: () => {
          toast.success('Wallet adjusted')
          setAdjustOpen(false)
          setAdjustRupees('')
          setAdjustType('credit')
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <FormField label="User ID" className="min-w-[260px] flex-1">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter a user id…"
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </FormField>
          <Button variant="outline" onClick={load} disabled={!userInput.trim()}>
            Load
          </Button>
          {activeId && canAdjustAny && (
            <Button onClick={() => setAdjustOpen(true)}>Adjust</Button>
          )}
        </CardContent>
      </Card>

      {activeId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Ledger — {activeId}
              {balance != null && (
                <span className="ml-2 font-normal text-muted-foreground">
                  Balance {formatMoney(balance)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={ledger.data?.data}
              loading={ledger.isLoading}
              error={ledger.error}
              onRetry={() => ledger.refetch()}
              emptyTitle="No wallet transactions"
            />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onConfirm={handleAdjust}
        title="Adjust wallet credits"
        description={`Adjusting credits for user ${activeId}. This is written to the audit log.`}
        confirmLabel="Apply adjustment"
        requireReason
        reasonHint="Required — recorded against the wallet transaction."
        loading={adjust.isPending}
      >
        <div className="mb-3 grid gap-3">
          <FormField label="Type">
            <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value as AdjustType)}>
              {ADJUST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Amount (₹)"
            hint={
              cappedOnly
                ? `Capped: max ${formatMoney(CAPPED_WALLET_LIMIT_PAISE)} per transaction.`
                : 'Entered in rupees; stored in paise.'
            }
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              value={adjustRupees}
              onChange={(e) => setAdjustRupees(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </div>
      </ConfirmDialog>
    </div>
  )
}

interface BulkCreditResult {
  audienceCount?: number
}

function BulkCreditTab() {
  const canAdjust = useCan('wallet.adjust')

  const [segment, setSegment] = useState('')
  const [userIdsText, setUserIdsText] = useState('')
  const [rupees, setRupees] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const userIds = useMemo(
    () =>
      userIdsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [userIdsText],
  )

  const audience = useMemo(
    () => (segment ? { segment } : userIds.length ? { userIds } : null),
    [segment, userIds],
  )

  const previewCount = segment ? undefined : userIds.length

  const bulk = useMutation({
    mutationFn: (vars: {
      audience: { segment?: string; userIds?: string[] }
      amount: number
      reason: string
    }) =>
      apiRequest<BulkCreditResult>('/wallet/bulk-credit', {
        method: 'POST',
        body: vars,
        idempotent: true,
      }),
  })

  function openConfirm() {
    if (!audience) {
      toast.error('Provide an audience', 'Pick a segment or enter user ids.')
      return
    }
    const amount = Number(rupees)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount in rupees')
      return
    }
    setConfirmOpen(true)
  }

  function handleSend(reason: string) {
    if (!audience) return
    bulk.mutate(
      { audience, amount: rupeesToPaise(Number(rupees)), reason },
      {
        onSuccess: (res) => {
          toast.success(
            'Bulk credit queued',
            res?.audienceCount != null ? `${formatNumber(res.audienceCount)} users` : undefined,
          )
          setConfirmOpen(false)
          setSegment('')
          setUserIdsText('')
          setRupees('')
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk credit issuance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="Audience segment"
          hint="Choose a segment OR list user ids below — not both."
        >
          <Select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            disabled={userIds.length > 0}
          >
            <option value="">— None —</option>
            <option value="all_active">All active users</option>
            <option value="new_30d">New users (last 30 days)</option>
            <option value="flagged">Flagged users</option>
          </Select>
        </FormField>

        <FormField
          label="User IDs"
          hint={
            previewCount != null && previewCount > 0
              ? `${formatNumber(previewCount)} user(s) targeted.`
              : 'Comma-separated user ids.'
          }
        >
          <Textarea
            value={userIdsText}
            onChange={(e) => setUserIdsText(e.target.value)}
            placeholder="usr_1, usr_2, usr_3…"
            disabled={!!segment}
          />
        </FormField>

        <FormField label="Amount per user (₹)" hint="Entered in rupees; stored in paise.">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            placeholder="0.00"
          />
        </FormField>

        <div className="flex justify-end">
          <Button onClick={openConfirm} disabled={!canAdjust}>
            Review &amp; send
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        title="Send bulk credit"
        description={
          segment
            ? `Credit ${formatMoney(rupeesToPaise(Number(rupees) || 0))} to segment "${segment}".`
            : `Credit ${formatMoney(rupeesToPaise(Number(rupees) || 0))} to ${formatNumber(
                previewCount ?? 0,
              )} user(s).`
        }
        confirmLabel="Send credits"
        requireReason
        reasonHint="Required — recorded in the audit log."
        loading={bulk.isPending}
      />
    </Card>
  )
}
