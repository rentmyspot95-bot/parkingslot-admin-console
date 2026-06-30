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
import { formatDate, formatMoney, formatNumber } from '@/shared/lib/format'
import type { Host } from '@/shared/types/domain'
import { useHosts } from './api'

const KYC_OPTIONS = [
  { value: '', label: 'All KYC' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export function HostsPage() {
  const navigate = useNavigate()
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['kycStatus', 'status'],
  })

  const query = useHosts(apiParams)

  const columns = useMemo<ColumnDef<Host, unknown>[]>(
    () => [
      { id: 'displayName', header: 'Host', accessorKey: 'displayName' },
      {
        id: 'kycStatus',
        header: 'KYC',
        accessorKey: 'kycStatus',
        cell: ({ row }) => <StatusBadge status={row.original.kycStatus} />,
      },
      {
        id: 'listingCount',
        header: 'Listings',
        accessorKey: 'listingCount',
        cell: ({ row }) => formatNumber(row.original.listingCount),
      },
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        cell: ({ row }) => (row.original.rating != null ? row.original.rating.toFixed(1) : '—'),
      },
      {
        id: 'totalEarnings',
        header: 'Earnings',
        accessorKey: 'totalEarnings',
        sortKey: 'totalEarnings',
        cell: ({ row }) => formatMoney(row.original.totalEarnings),
      } as ColumnDef<Host, unknown>,
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'createdAt',
        header: 'Joined',
        accessorKey: 'createdAt',
        sortKey: 'createdAt',
        cell: ({ row }) => formatDate(row.original.createdAt),
      } as ColumnDef<Host, unknown>,
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Hosts" description="Verify hosts and manage their standing." />

      <Toolbar>
        <SearchInput value={state.q} onChange={setQuery} placeholder="Search hosts…" />
        <FilterSelect
          label="KYC"
          value={state.filters.kycStatus ?? ''}
          onChange={(v) => setFilter('kycStatus', v)}
          options={KYC_OPTIONS}
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
        onRowClick={(row) => navigate(`/hosts/${row.id}`)}
        emptyTitle="No hosts found"
        emptyDescription="No hosts match the current filters."
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
