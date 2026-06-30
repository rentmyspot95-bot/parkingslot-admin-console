import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type OnChangeFn,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '../lib/cn'
import { EmptyState, ErrorState, SkeletonRows } from './states'

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[] | undefined
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: T) => void
  /** Server-side sort state, e.g. "-createdAt". */
  sort?: string
  onSortChange?: (sort: string) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: T) => string
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  onRowClick,
  sort,
  onSortChange,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection: rowSelection ?? {} },
    onRowSelectionChange,
    enableRowSelection: !!onRowSelectionChange,
    getRowId,
    manualSorting: true,
    manualPagination: true,
  })

  function toggleSort(columnId: string) {
    if (!onSortChange) return
    const desc = sort === `-${columnId}`
    const asc = sort === columnId
    if (asc) onSortChange(`-${columnId}`)
    else if (desc) onSortChange('')
    else onSortChange(columnId)
  }

  const colCount = columns.length

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            {table.getHeaderGroups()[0]?.headers.map((header) => {
              const def = header.column.columnDef as ColumnDef<T> & { sortKey?: string }
              const sortKey = def.sortKey
              const sortable = !!sortKey && !!onSortChange
              const isAsc = sort === sortKey
              const isDesc = sort === `-${sortKey}`
              return (
                <th
                  key={header.id}
                  className={cn(
                    'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    sortable && 'cursor-pointer select-none hover:text-foreground',
                  )}
                  onClick={sortable ? () => toggleSort(sortKey!) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortable &&
                      (isAsc ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : isDesc ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      ))}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows rows={8} cols={colCount} />}
          {!loading && !!error && (
            <tr>
              <td colSpan={colCount}>
                <ErrorState error={error} onRetry={onRetry} />
              </td>
            </tr>
          )}
          {!loading && !error && data && data.length === 0 && (
            <tr>
              <td colSpan={colCount}>
                <EmptyState title={emptyTitle ?? 'No results'} description={emptyDescription} />
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-muted/40',
                  row.getIsSelected() && 'bg-brand-50/60',
                )}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
