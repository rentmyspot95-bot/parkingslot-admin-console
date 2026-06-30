import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Star } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  DataTable,
  DetailList,
  DetailRow,
  Drawer,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
  Tabs,
  toast,
  Toolbar,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatDateTime, truncate } from '@/shared/lib/format'
import type { Review } from '@/shared/types/domain'
import { useModerateReview, useReviews } from './api'

const STATUS_TABS = [
  { value: 'flagged', label: 'Flagged' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'removed', label: 'Removed' },
  { value: 'all', label: 'All' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums">
      {rating}
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
    </span>
  )
}

export function ReviewsPage() {
  const { state, apiParams, setPage, setSort, setQuery, setFilter } = useListParams({
    filterKeys: ['status'],
  })

  // Default to the flagged moderation queue when no status is set in the URL.
  const status = state.filters.status ?? 'flagged'
  const effectiveParams = useMemo(
    () => ({ ...apiParams, status: status === 'all' ? undefined : status }),
    [apiParams, status],
  )

  const query = useReviews(effectiveParams)

  const [active, setActive] = useState<Review | null>(null)

  const columns = useMemo<ColumnDef<Review, unknown>[]>(
    () => [
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        cell: ({ row }) => <Stars rating={row.original.rating} />,
      },
      {
        id: 'text',
        header: 'Review',
        accessorKey: 'text',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{truncate(row.original.text, 80)}</span>
        ),
      },
      { id: 'listingTitle', header: 'Listing', accessorKey: 'listingTitle',
        cell: ({ row }) => row.original.listingTitle ?? '—' },
      { id: 'seekerName', header: 'Seeker', accessorKey: 'seekerName',
        cell: ({ row }) => row.original.seekerName ?? '—' },
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
      } as ColumnDef<Review, unknown>,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setActive(row.original)
            }}
          >
            Moderate
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Reviews" description="Keep ratings trustworthy." />

      <Tabs tabs={STATUS_TABS} value={status} onChange={(v) => setFilter('status', v)} />

      <Toolbar>
        <SearchInput value={state.q} onChange={setQuery} placeholder="Search reviews…" />
      </Toolbar>

      <DataTable
        columns={columns}
        data={query.data?.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        sort={state.sort}
        onSortChange={setSort}
        onRowClick={(row) => setActive(row)}
        emptyTitle="No reviews found"
        emptyDescription="No reviews match the current filter."
      />

      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />

      <ModerationDrawer review={active} onClose={() => setActive(null)} />
    </div>
  )
}

type ModerationKind = 'hide' | 'remove' | 'restore' | null

function ModerationDrawer({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const canModerate = useCan('review.moderate')
  const moderate = useModerateReview(review?.id ?? '')
  const [kind, setKind] = useState<ModerationKind>(null)

  function runModeration(reason: string) {
    if (!kind) return
    moderate.mutate(
      { action: kind, reason },
      {
        onSuccess: () => {
          toast.success(
            kind === 'hide' ? 'Review hidden' : kind === 'remove' ? 'Review removed' : 'Review restored',
          )
          setKind(null)
          onClose()
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <Drawer
      open={!!review}
      onClose={onClose}
      title="Review moderation"
      subtitle={review?.id}
      width="lg"
    >
      {review && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            <StatusBadge status={review.status} />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            {review.text ?? <span className="text-muted-foreground">No review text.</span>}
          </div>

          <DetailList>
            <DetailRow label="Listing">{review.listingTitle ?? review.listingId}</DetailRow>
            <DetailRow label="Seeker">{review.seekerName ?? review.seekerId}</DetailRow>
            <DetailRow label="Created">{formatDateTime(review.createdAt)}</DetailRow>
            {review.moderatedBy && (
              <DetailRow label="Moderated by">{review.moderatedBy}</DetailRow>
            )}
            {review.moderationReason && (
              <DetailRow label="Moderation reason">{review.moderationReason}</DetailRow>
            )}
          </DetailList>

          {canModerate && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKind('hide')}
                disabled={review.status === 'hidden'}
              >
                Hide
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setKind('remove')}
                disabled={review.status === 'removed'}
              >
                Remove
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setKind('restore')}
                disabled={review.status === 'visible'}
              >
                Restore
              </Button>
            </div>
          )}

          <ConfirmDialog
            open={kind === 'hide'}
            onClose={() => setKind(null)}
            onConfirm={runModeration}
            title="Hide review"
            description="Hidden reviews are not shown to seekers but can be restored."
            confirmLabel="Hide review"
            requireReason
            loading={moderate.isPending}
          />
          <ConfirmDialog
            open={kind === 'remove'}
            onClose={() => setKind(null)}
            onConfirm={runModeration}
            title="Remove review"
            description="Remove this review from the listing."
            confirmLabel="Remove review"
            variant="danger"
            requireReason
            loading={moderate.isPending}
          />
          <ConfirmDialog
            open={kind === 'restore'}
            onClose={() => setKind(null)}
            onConfirm={runModeration}
            title="Restore review"
            description="Make this review visible to seekers again."
            confirmLabel="Restore review"
            requireReason
            loading={moderate.isPending}
          />
        </div>
      )}
    </Drawer>
  )
}
