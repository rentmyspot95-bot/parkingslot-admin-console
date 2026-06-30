import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useListings } from './api'
import {
  Badge,
  Button,
  DataTable,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  Toolbar,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { formatDate, formatMoney } from '@/shared/lib/format'
import {
  BOOKING_MODE_LABELS,
  VEHICLE_TYPE_LABELS,
  type BookingMode,
} from '@/shared/types/common'
import type { Listing } from '@/shared/types/domain'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Rejected' },
]

const BOOKING_MODE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'instant_book', label: BOOKING_MODE_LABELS.instant_book },
  { value: 'request_to_book', label: BOOKING_MODE_LABELS.request_to_book },
]

export function ListingsPage() {
  const navigate = useNavigate()
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status', 'bookingMode'],
  })

  const query = useListings(apiParams)

  const columns = useMemo<ColumnDef<Listing, unknown>[]>(
    () => [
      { id: 'title', header: 'Title', accessorKey: 'title' },
      {
        id: 'hostName',
        header: 'Host',
        accessorKey: 'hostName',
        cell: ({ row }) => row.original.hostName ?? '—',
      },
      {
        id: 'vehicleTypes',
        header: 'Vehicle types',
        cell: ({ row }) =>
          row.original.vehicleTypes.map((v) => VEHICLE_TYPE_LABELS[v]).join(', ') || '—',
      },
      {
        id: 'bookingMode',
        header: 'Booking mode',
        cell: ({ row }) => (
          <Badge tone={row.original.bookingMode === 'instant_book' ? 'blue' : 'grey'}>
            {BOOKING_MODE_LABELS[row.original.bookingMode]}
          </Badge>
        ),
      },
      {
        ...{
          id: 'pricePerHour',
          header: 'Price / hr',
          accessorKey: 'pricePerHour',
          cell: ({ row }: { row: { original: Listing } }) =>
            formatMoney(row.original.pricePerHour),
        },
        sortKey: 'pricePerHour',
      } as ColumnDef<Listing, unknown>,
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        ...{
          id: 'createdAt',
          header: 'Created',
          accessorKey: 'createdAt',
          cell: ({ row }: { row: { original: Listing } }) => formatDate(row.original.createdAt),
        },
        sortKey: 'createdAt',
      } as ColumnDef<Listing, unknown>,
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Listings"
        description="Moderate parking inventory: approvals, pricing, and booking mode."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter('status', 'pending_review')}
          >
            <ListChecks className="h-4 w-4" />
            Review queue
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={state.q}
          onChange={setQuery}
          placeholder="Search title, host, address…"
        />
        <FilterSelect
          label="Status"
          value={state.filters.status ?? ''}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Booking mode"
          value={state.filters.bookingMode ?? ''}
          onChange={(v) => setFilter('bookingMode', v as BookingMode | '')}
          options={BOOKING_MODE_OPTIONS}
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
        onRowClick={(row) => navigate(`/listings/${row.id}`)}
        emptyTitle="No listings"
        emptyDescription="No listings match the current filters."
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
