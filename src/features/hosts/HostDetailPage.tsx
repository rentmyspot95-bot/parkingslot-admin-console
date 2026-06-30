import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
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
  StatusBadge,
  toast,
} from '@/shared/ui'
import { useCan } from '@/shared/auth/useAuth'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/shared/lib/format'
import type { KycDoc } from '@/shared/types/domain'
import { useHost, useKycDecision, useUpdateHostStatus } from './api'

type DialogKind = 'reject' | 'resubmit' | 'suspend' | 'reactivate' | null

export function HostDetailPage() {
  const { id = '' } = useParams()
  const host = useHost(id)
  const kyc = useKycDecision(id)
  const statusMutation = useUpdateHostStatus(id)

  const canVerify = useCan('host.verify')
  const canSuspend = useCan('host.suspend')

  const [dialog, setDialog] = useState<DialogKind>(null)

  function approveKyc() {
    kyc.mutate(
      { decision: 'approve' },
      {
        onSuccess: () => toast.success('KYC approved'),
        onError: (e) => toastApiError(e),
      },
    )
  }

  function rejectKyc(reason: string) {
    kyc.mutate(
      { decision: 'reject', reason },
      {
        onSuccess: () => {
          toast.success('KYC rejected')
          setDialog(null)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function requestResubmission(reason: string) {
    kyc.mutate(
      { decision: 'resubmit', reason },
      {
        onSuccess: () => {
          toast.success('Re-submission requested')
          setDialog(null)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function setHostStatus(status: 'active' | 'suspended', reason: string) {
    statusMutation.mutate(
      { status, reason },
      {
        onSuccess: () => {
          toast.success(status === 'suspended' ? 'Host suspended' : 'Host reactivated')
          setDialog(null)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  if (host.isLoading) return <LoadingState />
  if (host.isError || !host.data)
    return <ErrorState error={host.error} onRetry={() => host.refetch()} />

  const data = host.data
  const isSuspended = data.status === 'suspended'

  return (
    <div className="space-y-4">
      <Link
        to="/hosts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to hosts
      </Link>

      <PageHeader
        title={data.displayName}
        description={`Host ${data.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canVerify && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={approveKyc}
                  loading={kyc.isPending}
                  disabled={data.kycStatus === 'verified'}
                >
                  Approve KYC
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDialog('reject')}>
                  Reject KYC
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog('resubmit')}>
                  Request re-submission
                </Button>
              </>
            )}
            {canSuspend &&
              (isSuspended ? (
                <Button variant="outline" size="sm" onClick={() => setDialog('reactivate')}>
                  Reactivate host
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setDialog('suspend')}>
                  Suspend host
                </Button>
              ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Host detail</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Display name">{data.displayName}</DetailRow>
              <DetailRow label="User ID">{data.userId}</DetailRow>
              <DetailRow label="KYC status">
                <StatusBadge status={data.kycStatus} />
              </DetailRow>
              <DetailRow label="Account status">
                <StatusBadge status={data.status} />
              </DetailRow>
              <DetailRow label="Rating">
                {data.rating != null ? data.rating.toFixed(1) : '—'}
              </DetailRow>
              <DetailRow label="Joined">{formatDate(data.createdAt)}</DetailRow>
            </DetailList>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Listings & earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailRow label="Listings">{formatNumber(data.listingCount)}</DetailRow>
              <DetailRow label="Total earnings">{formatMoney(data.totalEarnings)}</DetailRow>
            </DetailList>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Payout account</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payoutAccount?.upi || data.payoutAccount?.bank ? (
              <DetailList>
                {data.payoutAccount?.upi && (
                  <DetailRow label="UPI">{data.payoutAccount.upi}</DetailRow>
                )}
                {data.payoutAccount?.bank && (
                  <>
                    <DetailRow label="Account name">{data.payoutAccount.bank.name}</DetailRow>
                    <DetailRow label="Account number">
                      {data.payoutAccount.bank.accountNumber}
                    </DetailRow>
                    <DetailRow label="IFSC">{data.payoutAccount.bank.ifsc}</DetailRow>
                  </>
                )}
              </DetailList>
            ) : (
              <p className="text-sm text-muted-foreground">No payout account on file.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC review</CardTitle>
        </CardHeader>
        <CardContent>
          {data.kycDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KYC documents submitted.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.kycDocs.map((doc, i) => (
                <KycDocCard
                  key={`${doc.type}-${i}`}
                  doc={doc}
                  canVerify={canVerify}
                  approveDisabled={kyc.isPending}
                  onApprove={approveKyc}
                  onReject={() => setDialog('reject')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={rejectKyc}
        title="Reject KYC"
        description={`Reject KYC for ${data.displayName}. The host will be notified.`}
        confirmLabel="Reject KYC"
        variant="danger"
        requireReason
        reasonLabel="Rejection reason"
        loading={kyc.isPending}
      />

      <ConfirmDialog
        open={dialog === 'resubmit'}
        onClose={() => setDialog(null)}
        onConfirm={requestResubmission}
        title="Request re-submission"
        description={`Ask ${data.displayName} to re-submit their KYC documents.`}
        confirmLabel="Request re-submission"
        requireReason
        reasonLabel="What needs to be re-submitted?"
        loading={kyc.isPending}
      />

      <ConfirmDialog
        open={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => setHostStatus('suspended', reason)}
        title="Suspend host"
        description={`Suspend ${data.displayName}. This auto-pauses all of their listings.`}
        confirmLabel="Suspend host"
        variant="danger"
        requireReason
        reasonLabel="Suspension reason"
        loading={statusMutation.isPending}
      />

      <ConfirmDialog
        open={dialog === 'reactivate'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => setHostStatus('active', reason)}
        title="Reactivate host"
        description={`Reactivate ${data.displayName}.`}
        confirmLabel="Reactivate host"
        requireReason
        reasonLabel="Reactivation reason"
        loading={statusMutation.isPending}
      />
    </div>
  )
}

function KycDocCard({
  doc,
  canVerify,
  approveDisabled,
  onApprove,
  onReject,
}: {
  doc: KycDoc
  canVerify: boolean
  approveDisabled: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const reviewed = !!doc.reviewedAt
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-video bg-muted"
      >
        <img src={doc.url} alt={doc.type} className="h-full w-full object-cover" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-3 w-3" />
          Open
        </span>
      </a>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{doc.type}</span>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        </div>
        {reviewed ? (
          <p className="text-xs text-muted-foreground">
            Reviewed{doc.reviewedBy ? ` by ${doc.reviewedBy}` : ''} · {formatDateTime(doc.reviewedAt)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        )}
        {canVerify && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onApprove} disabled={approveDisabled}>
              Approve
            </Button>
            <Button variant="danger" size="sm" onClick={onReject}>
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
