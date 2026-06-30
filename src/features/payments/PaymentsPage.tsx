import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import {
  DataTable,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  Toolbar,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { formatDateTime, formatMoney, truncate } from '@/shared/lib/format'
import type { Payment } from '@/shared/types/domain'
import { usePayments } from './api'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'created', label: 'Created' },
  { value: 'authorized', label: 'Authorized' },
  { value: 'captured', label: 'Captured' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially refunded' },
]

export function PaymentsPage() {
  const navigate = useNavigate()
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status'],
  })

  const query = usePayments(apiParams)

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'Payment',
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {truncate(row.original.gatewayPaymentId ?? row.original.id, 18)}
          </span>
        ),
      },
      {
        id: 'bookingId',
        header: 'Booking',
        accessorKey: 'bookingId',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{truncate(row.original.bookingId, 18)}</span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        sortKey: 'amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      } as ColumnDef<Payment, unknown>,
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        sortKey: 'createdAt',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      } as ColumnDef<Payment, unknown>,
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Payment visibility and refunds against Razorpay." />

      <Toolbar>
        <SearchInput
          value={state.q}
          onChange={setQuery}
          placeholder="Search by gateway id, booking…"
        />
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
        onRowClick={(row) => navigate(`/payments/${row.id}`)}
        emptyTitle="No payments found"
        emptyDescription="No payments match the current filters."
      />

      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
