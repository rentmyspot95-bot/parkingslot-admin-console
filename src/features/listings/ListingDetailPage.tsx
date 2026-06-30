import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useListing, useModerateListing, useUpdateListing, type ModerationAction } from './api'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DetailList,
  DetailRow,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import {
  BOOKING_MODE_LABELS,
  VEHICLE_TYPE_LABELS,
  type BookingMode,
} from '@/shared/types/common'
import type { Listing } from '@/shared/types/domain'

interface ModerationIntent {
  action: ModerationAction
  title: string
  description: string
  confirmLabel: string
  variant: 'primary' | 'danger'
  requireReason: boolean
}

export function ListingDetailPage() {
  const { id = '' } = useParams()
  const query = useListing(id)
  const moderate = useModerateListing(id)
  const update = useUpdateListing(id)

  const canApprove = useCan('listing.approve')
  const canTakedown = useCan('listing.takedown')
  const canEdit = useCan('listing.edit')

  const [intent, setIntent] = useState<ModerationIntent | null>(null)

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }

  const listing: Listing = query.data
  const { geo } = listing
  const mapsUrl = `https://maps.google.com/?q=${geo.lat},${geo.lng}`

  function openIntent(next: ModerationIntent) {
    setIntent(next)
  }

  function confirmModeration(reason: string) {
    if (!intent) return
    const note = reason.trim() || undefined
    moderate.mutate(
      { action: intent.action, note },
      {
        onSuccess: () => {
          toast.success('Listing updated', `Action: ${intent.action}`)
          setIntent(null)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function changeBookingMode(mode: BookingMode) {
    if (mode === listing.bookingMode) return
    update.mutate(
      { bookingMode: mode },
      {
        onSuccess: () => toast.success('Booking mode updated', BOOKING_MODE_LABELS[mode]),
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Link
        to="/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <PageHeader
        title={listing.title}
        description={listing.address}
        actions={<StatusBadge status={listing.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              {listing.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos uploaded.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {listing.photos.map((src, i) => (
                    <img
                      key={src + i}
                      src={src}
                      alt={`${listing.title} photo ${i + 1}`}
                      className="aspect-video w-full rounded-md border border-border object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
                Map preview · {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
              >
                Open in Google Maps
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              {listing.amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">None listed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {listing.amenities.map((a) => (
                    <Badge key={a} tone="neutral">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList>
                <DetailRow label="Host">{listing.hostName ?? listing.hostId}</DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={listing.status} />
                </DetailRow>
                <DetailRow label="Booking mode">
                  <Badge tone={listing.bookingMode === 'instant_book' ? 'blue' : 'grey'}>
                    {BOOKING_MODE_LABELS[listing.bookingMode]}
                  </Badge>
                </DetailRow>
                <DetailRow label="Price / hour">{formatMoney(listing.pricePerHour)}</DetailRow>
                <DetailRow label="Price / day">{formatMoney(listing.pricePerDay)}</DetailRow>
                <DetailRow label="Vehicle types">
                  {listing.vehicleTypes.map((v) => VEHICLE_TYPE_LABELS[v]).join(', ') || '—'}
                </DetailRow>
                <DetailRow label="Availability">
                  {listing.availabilityRules
                    ? 'Custom rules configured'
                    : 'Always available (no rules)'}
                </DetailRow>
                <DetailRow label="Created">{formatDateTime(listing.createdAt)}</DetailRow>
                <DetailRow label="Updated">{formatDateTime(listing.updatedAt)}</DetailRow>
                {listing.moderationNote && (
                  <DetailRow label="Moderation note">{listing.moderationNote}</DetailRow>
                )}
              </DetailList>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Booking mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select
                  value={listing.bookingMode}
                  disabled={update.isPending}
                  onChange={(e) => changeBookingMode(e.target.value as BookingMode)}
                >
                  <option value="instant_book">{BOOKING_MODE_LABELS.instant_book}</option>
                  <option value="request_to_book">{BOOKING_MODE_LABELS.request_to_book}</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls whether seekers can instantly book or must request owner approval.
                </p>
              </CardContent>
            </Card>
          )}

          {(canApprove || canTakedown) && (
            <Card>
              <CardHeader>
                <CardTitle>Moderation</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {canApprove && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        openIntent({
                          action: 'approve',
                          title: 'Approve listing',
                          description: 'Make this listing active and bookable.',
                          confirmLabel: 'Approve',
                          variant: 'primary',
                          requireReason: false,
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openIntent({
                          action: 'reject',
                          title: 'Reject listing',
                          description: 'Reject this listing with a moderation note.',
                          confirmLabel: 'Reject',
                          variant: 'danger',
                          requireReason: true,
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openIntent({
                          action: 'pause',
                          title: 'Pause listing',
                          description: 'Temporarily hide this listing from search.',
                          confirmLabel: 'Pause',
                          variant: 'primary',
                          requireReason: false,
                        })
                      }
                    >
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openIntent({
                          action: 'unpause',
                          title: 'Unpause listing',
                          description: 'Restore this listing to active.',
                          confirmLabel: 'Unpause',
                          variant: 'primary',
                          requireReason: false,
                        })
                      }
                    >
                      Unpause
                    </Button>
                  </>
                )}
                {canTakedown && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="col-span-2"
                    onClick={() =>
                      openIntent({
                        action: 'takedown',
                        title: 'Take down listing',
                        description:
                          'Permanently remove this listing from the marketplace. Requires a reason.',
                        confirmLabel: 'Take down',
                        variant: 'danger',
                        requireReason: true,
                      })
                    }
                  >
                    Takedown
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!intent}
        onClose={() => setIntent(null)}
        onConfirm={confirmModeration}
        title={intent?.title ?? ''}
        description={intent?.description}
        confirmLabel={intent?.confirmLabel}
        variant={intent?.variant}
        requireReason={intent?.requireReason}
        reasonLabel="Moderation note"
        loading={moderate.isPending}
      />
    </div>
  )
}
