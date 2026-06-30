import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useUsers } from './api'
import {
  Badge,
  DataTable,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  Toolbar,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format'
import type { User } from '@/shared/types/domain'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
]

const FLAGGED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Flagged' },
  { value: 'false', label: 'Not flagged' },
]

export function UsersPage() {
  const navigate = useNavigate()
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status', 'flagged'],
  })

  const query = useUsers(apiParams)

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      { id: 'name', header: 'Name', accessorKey: 'name', cell: ({ row }) => row.original.name },
      { id: 'phone', header: 'Phone', accessorKey: 'phone', cell: ({ row }) => row.original.phone },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) => row.original.email ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'walletCreditBalance',
        header: 'Wallet',
        accessorKey: 'walletCreditBalance',
        cell: ({ row }) => formatMoney(row.original.walletCreditBalance),
      },
      {
        id: 'bookingCount',
        header: 'Bookings',
        accessorKey: 'bookingCount',
        cell: ({ row }) => formatNumber(row.original.bookingCount),
        sortKey: 'bookingCount',
      } as ColumnDef<User, unknown>,
      {
        id: 'flagged',
        header: 'Flagged',
        accessorKey: 'flagged',
        cell: ({ row }) =>
          row.original.flagged ? <Badge tone="red">Flagged</Badge> : <span className="text-muted-foreground">—</span>,
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }) => formatDate(row.original.createdAt),
        sortKey: 'createdAt',
      } as ColumnDef<User, unknown>,
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Find and manage seeker accounts." />

      <Toolbar>
        <SearchInput
          value={state.q}
          onChange={setQuery}
          placeholder="Search by phone, email, or name…"
        />
        <FilterSelect
          label="Status"
          value={state.filters.status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Flagged"
          value={state.filters.flagged ?? ''}
          onChange={(v) => setFilter('flagged', v)}
          options={FLAGGED_OPTIONS}
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
        onRowClick={(row) => navigate(`/users/${row.id}`)}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filters."
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
