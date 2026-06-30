import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
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
import { formatDateTime, formatMoney, truncate } from '@/shared/lib/format'
import { BOOKING_MODE_LABELS, type BookingMode } from '@/shared/types/common'
import type { Booking, BookingStatus } from '@/shared/types/domain'
import { fetchList } from '@/shared/api/list'
import { useQuery } from '@tanstack/react-query'

const BOOKING_STATUSES: BookingStatus[] = [
  'requested',
  'pending_owner_approval',
  'confirmed',
  'active',
  'completed',
  'rejected',
  'auto_rejected',
  'expired',
  'cancelled',
  'disputed',
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
]

const MODE_OPTIONS = [
  { value: '', label: 'All modes' },
  ...(Object.keys(BOOKING_MODE_LABELS) as BookingMode[]).map((m) => ({
    value: m,
    label: BOOKING_MODE_LABELS[m],
  })),
]

export function BookingsPage() {
  const navigate = useNavigate()
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status', 'bookingMode'],
  })

  const query = useQuery({
    queryKey: ['bookings', apiParams],
    queryFn: ({ signal }) => fetchList<Booking>('/bookings', apiParams, signal),
  })

  const columns = useMemo<ColumnDef<Booking, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'ID',
        accessorKey: 'id',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {truncate(row.original.id, 10)}
          </span>
        ),
      },
      {
        id: 'listingTitle',
        header: 'Listing',
        accessorKey: 'listingTitle',
        cell: ({ row }) => row.original.listingTitle ?? '—',
      },
      {
        id: 'seekerName',
        header: 'Seeker',
        accessorKey: 'seekerName',
        cell: ({ row }) => row.original.seekerName ?? '—',
      },
      {
        id: 'hostName',
        header: 'Host',
        accessorKey: 'hostName',
        cell: ({ row }) => row.original.hostName ?? '—',
      },
      {
        id: 'slot',
        header: 'Slot',
        cell: ({ row }) => formatDateTime(row.original.slot.start),
      },
      {
        id: 'bookingMode',
        header: 'Mode',
        cell: ({ row }) => (
          <Badge tone={row.original.bookingMode === 'instant_book' ? 'blue' : 'amber'}>
            {BOOKING_MODE_LABELS[row.original.bookingMode]}
          </Badge>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        sortKey: 'amount',
        cell: ({ row }) => formatMoney(row.original.amount),
      } as ColumnDef<Booking, unknown>,
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        sortKey: 'createdAt',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      } as ColumnDef<Booking, unknown>,
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Bookings" description="Investigate and resolve bookings across both booking modes." />
      <Toolbar>
        <SearchInput
          value={state.q}
          onChange={setQuery}
          placeholder="Search bookings…"
        />
        <FilterSelect
          label="Status"
          value={state.filters.status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Mode"
          value={state.filters.bookingMode ?? ''}
          onChange={(v) => setFilter('bookingMode', v)}
          options={MODE_OPTIONS}
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
        onRowClick={(row) => navigate(`/bookings/${row.id}`)}
        emptyTitle="No bookings"
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
