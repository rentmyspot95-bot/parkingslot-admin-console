import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  useUser,
  useUserBookings,
  useUserWallet,
  useUpdateUserStatus,
  useWalletAdjust,
  type WalletAdjustType,
} from './api'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailRow,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  Select,
  Input,
  StatusBadge,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatDate, formatDateTime, formatMoney, rupeesToPaise } from '@/shared/lib/format'
import { VEHICLE_TYPE_LABELS } from '@/shared/types/common'
import type { Booking, WalletTransaction } from '@/shared/types/domain'

const ADJUST_TYPES: { value: WalletAdjustType; label: string }[] = [
  { value: 'credit', label: 'Credit (add)' },
  { value: 'debit', label: 'Debit / clawback' },
  { value: 'adjustment', label: 'Adjustment' },
]

export function UserDetailPage() {
  const { id = '' } = useParams<{ id: string }>()

  const userQuery = useUser(id)
  const walletQuery = useUserWallet(id)
  const bookingsQuery = useUserBookings(id)

  const canAdjust = useCan('wallet.adjust')
  const canSuspend = useCan('user.suspend')
  const canDelete = useCan('user.delete')

  const updateStatus = useUpdateUserStatus(id)
  const walletAdjust = useWalletAdjust(id)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [adjustType, setAdjustType] = useState<WalletAdjustType>('credit')
  const [adjustRupees, setAdjustRupees] = useState('')

  const user = userQuery.data

  const walletColumns = useMemo<ColumnDef<WalletTransaction, unknown>[]>(
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

  const bookingColumns = useMemo<ColumnDef<Booking, unknown>[]>(
    () => [
      {
        id: 'createdAt',
        header: 'Date',
        accessorKey: 'createdAt',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'listingTitle',
        header: 'Listing',
        accessorKey: 'listingTitle',
        cell: ({ row }) => row.original.listingTitle ?? row.original.listingId,
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  function handleAdjust(reason: string) {
    const rupees = Number(adjustRupees)
    if (!Number.isFinite(rupees) || rupees <= 0) {
      toast.error('Enter a valid amount in rupees')
      return
    }
    walletAdjust.mutate(
      { type: adjustType, amount: rupeesToPaise(rupees), reason },
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

  function handleSuspendToggle(reason: string) {
    const next = user?.status === 'suspended' ? 'active' : 'suspended'
    updateStatus.mutate(
      { status: next, reason },
      {
        onSuccess: () => {
          toast.success(next === 'suspended' ? 'User suspended' : 'User reactivated')
          setSuspendOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function handleDelete(reason: string) {
    updateStatus.mutate(
      { status: 'deleted', reason },
      {
        onSuccess: () => {
          toast.success('User soft-deleted')
          setDeleteOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  if (userQuery.isLoading) return <LoadingState />
  if (userQuery.isError || !user)
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} />

  const isSuspended = user.status === 'suspended'

  return (
    <div className="space-y-4">
      <Link
        to="/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <PageHeader
        title={user.name}
        description={user.phone}
        actions={
          <>
            {canSuspend && user.status !== 'deleted' && (
              <Button variant="outline" onClick={() => setSuspendOpen(true)}>
                {isSuspended ? 'Reactivate' : 'Suspend'}
              </Button>
            )}
            {canDelete && user.status !== 'deleted' && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Soft-delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Phone">{user.phone}</DetailRow>
              <DetailRow label="Email">{user.email ?? '—'}</DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={user.status} />
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(user.createdAt)}</DetailRow>
              <DetailRow label="Last active">{formatDateTime(user.lastActiveAt)}</DetailRow>
              <DetailRow label="Flagged">
                {user.flagged ? <Badge tone="red">Flagged</Badge> : '—'}
              </DetailRow>
            </DetailList>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {user.vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles on file.</p>
            ) : (
              <ul className="space-y-2">
                {user.vehicles.map((v, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{v.label}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Badge tone="neutral">{VEHICLE_TYPE_LABELS[v.type]}</Badge>
                      {v.plate ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Wallet — {formatMoney(user.walletCreditBalance)}</CardTitle>
          {canAdjust && (
            <Button size="sm" onClick={() => setAdjustOpen(true)}>
              Adjust credits
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable
            columns={walletColumns}
            data={walletQuery.data?.data}
            loading={walletQuery.isLoading}
            error={walletQuery.error}
            onRetry={() => walletQuery.refetch()}
            emptyTitle="No wallet transactions"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={bookingColumns}
            data={bookingsQuery.data?.data}
            loading={bookingsQuery.isLoading}
            error={bookingsQuery.error}
            onRetry={() => bookingsQuery.refetch()}
            emptyTitle="No bookings"
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onConfirm={handleAdjust}
        title="Adjust wallet credits"
        description={`Adjusting credits for ${user.name}. This is written to the audit log.`}
        confirmLabel="Apply adjustment"
        requireReason
        reasonLabel="Reason"
        reasonHint="Required — recorded against the wallet transaction."
        loading={walletAdjust.isPending}
      >
        <div className="mb-3 grid gap-3">
          <FormField label="Type">
            <Select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as WalletAdjustType)}
            >
              {ADJUST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount (₹)" hint="Entered in rupees; stored in paise.">
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

      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={handleSuspendToggle}
        title={isSuspended ? 'Reactivate user' : 'Suspend user'}
        description={
          isSuspended
            ? `Restore ${user.name} to active status.`
            : `Suspend ${user.name}. They will lose app access until reactivated.`
        }
        confirmLabel={isSuspended ? 'Reactivate' : 'Suspend'}
        variant={isSuspended ? 'primary' : 'danger'}
        requireReason
        loading={updateStatus.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Soft-delete user"
        description={`Soft-delete ${user.name}. This is reversible by Finance/Super Admin only.`}
        confirmLabel="Soft-delete"
        variant="danger"
        requireReason
        loading={updateStatus.isPending}
      />
    </div>
  )
}
