import { useMemo } from 'react'
import { Link } from 'react-router-dom'
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
import { formatFinancialTimestamp, formatMoney, truncate } from '@/shared/lib/format'
import { useRefunds, type RefundRow } from './api'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' },
]

export function RefundsPage() {
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status'],
  })

  const query = useRefunds(apiParams)

  const columns = useMemo<ColumnDef<RefundRow, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'Refund',
        accessorKey: 'id',
        cell: ({ row }) => <span className="font-mono text-xs">{truncate(row.original.id, 18)}</span>,
      },
      {
        id: 'paymentId',
        header: 'Payment',
        accessorKey: 'paymentId',
        cell: ({ row }) => (
          <Link
            to={`/payments/${row.original.paymentId}`}
            className="font-mono text-xs text-brand-700 hover:underline"
          >
            {truncate(row.original.paymentId, 18)}
          </Link>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        sortKey: 'amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      } as ColumnDef<RefundRow, unknown>,
      {
        id: 'reason',
        header: 'Reason',
        accessorKey: 'reason',
        cell: ({ row }) => truncate(row.original.reason, 48),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        sortKey: 'at',
        cell: ({ row }) => formatFinancialTimestamp(row.original.at),
      } as ColumnDef<RefundRow, unknown>,
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Refunds" description="All refunds issued across payments." />

      <Toolbar>
        <SearchInput value={state.q} onChange={setQuery} placeholder="Search refunds…" />
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
        emptyTitle="No refunds found"
        emptyDescription="No refunds match the current filters."
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
