import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useAuditLog } from './api'
import {
  Button,
  DataTable,
  DetailList,
  DetailRow,
  Drawer,
  FilterSelect,
  PageHeader,
  Pagination,
  SearchInput,
  Toolbar,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { apiRequest } from '@/shared/api/client'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useListParams } from '@/shared/hooks/useListParams'
import { formatDateTime, formatFinancialTimestamp } from '@/shared/lib/format'
import type { AuditLogEntry } from '@/shared/types/domain'

const TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'user', label: 'User' },
  { value: 'host', label: 'Host' },
  { value: 'listing', label: 'Listing' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'payout', label: 'Payout' },
  { value: 'review', label: 'Review' },
  { value: 'config', label: 'Config' },
  { value: 'admin', label: 'Admin' },
]

function jsonBlock(value: unknown): string {
  if (value === undefined) return '—'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function AuditPage() {
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['targetType'],
  })
  const query = useAuditLog(apiParams)
  const canExport = useCan('export.run')
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  const columns = useMemo<ColumnDef<AuditLogEntry, unknown>[]>(
    () => [
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => row.original.actorName ?? row.original.actorAdminId,
      },
      { id: 'action', header: 'Action', accessorKey: 'action' },
      { id: 'targetType', header: 'Target type', accessorKey: 'targetType' },
      { id: 'targetId', header: 'Target id', accessorKey: 'targetId' },
      {
        ...{
          id: 'createdAt',
          header: 'When',
          accessorKey: 'createdAt',
          cell: ({ row }: { row: { original: AuditLogEntry } }) =>
            formatDateTime(row.original.createdAt),
        },
        sortKey: 'createdAt',
      } as ColumnDef<AuditLogEntry, unknown>,
      {
        id: 'requestId',
        header: 'Request id',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.requestId ?? '—'}</span>
        ),
      },
    ],
    [],
  )

  function handleExport() {
    setExporting(true)
    apiRequest('/audit/export', { query: apiParams })
      .then(() => toast.success('Export started', 'This export is recorded in the audit log.'))
      .catch((e) => toastApiError(e))
      .finally(() => setExporting(false))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Who did what, when, and why."
        actions={
          canExport ? (
            <Button variant="outline" size="sm" loading={exporting} onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          ) : undefined
        }
      />

      <Toolbar>
        <SearchInput
          value={state.q}
          onChange={setQuery}
          placeholder="Search actor or action…"
        />
        <FilterSelect
          label="Target type"
          value={state.filters.targetType ?? ''}
          onChange={(v) => setFilter('targetType', v)}
          options={TARGET_TYPE_OPTIONS}
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
        emptyTitle="No audit entries"
        emptyDescription="No entries match the current filters."
      />

      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.action}
        subtitle={
          selected ? `${selected.targetType} · ${selected.targetId}` : undefined
        }
        width="xl"
      >
        {selected && (
          <div className="space-y-4">
            <DetailList>
              <DetailRow label="Actor">
                {selected.actorName ?? selected.actorAdminId}
              </DetailRow>
              <DetailRow label="Action">{selected.action}</DetailRow>
              <DetailRow label="Target">
                {selected.targetType} · {selected.targetId}
              </DetailRow>
              <DetailRow label="Reason">{selected.reason ?? '—'}</DetailRow>
              <DetailRow label="IP">{selected.ip ?? '—'}</DetailRow>
              <DetailRow label="Request id">
                <span className="font-mono text-xs">{selected.requestId ?? '—'}</span>
              </DetailRow>
              <DetailRow label="When">
                {formatFinancialTimestamp(selected.createdAt)}
              </DetailRow>
            </DetailList>

            <div>
              <p className="mb-2 text-sm font-semibold">Metadata diff</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Before
                  </p>
                  <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                    {jsonBlock(selected.metadata?.before)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    After
                  </p>
                  <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                    {jsonBlock(selected.metadata?.after)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
