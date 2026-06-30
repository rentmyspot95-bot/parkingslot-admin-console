import {
  Card,
  CardContent,
  ErrorState,
  LoadingState,
  PageHeader,
  toast,
} from '@/shared/ui'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useCan } from '@/shared/auth/useAuth'
import { cn } from '@/shared/lib/cn'
import { formatDateTime } from '@/shared/lib/format'
import type { FeatureFlag } from '@/shared/types/domain'
import { useFlags, useToggleFlag } from './api'

// Example flag keys (design doc §9.12): instant_book_rollout,
// default_request_to_book, new_payment_methods.

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-brand-600' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function FlagRow({ flag, canWrite }: { flag: FeatureFlag; canWrite: boolean }) {
  const toggle = useToggleFlag(flag.key)

  function onChange(next: boolean) {
    toggle.mutate(
      { enabled: next },
      {
        onSuccess: () => toast.success(`Flag ${next ? 'enabled' : 'disabled'}`, flag.key),
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium">{flag.key}</p>
        {flag.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{flag.description}</p>
        )}
        {(flag.updatedBy || flag.updatedAt) && (
          <p className="mt-1 text-xs text-muted-foreground">
            Updated{flag.updatedBy ? ` by ${flag.updatedBy}` : ''}
            {flag.updatedAt ? ` · ${formatDateTime(flag.updatedAt)}` : ''}
          </p>
        )}
      </div>
      <Toggle
        checked={flag.enabled}
        disabled={!canWrite || toggle.isPending}
        onChange={onChange}
      />
    </div>
  )
}

export function FeatureFlagsPage() {
  const canWrite = useCan('config.write')
  const query = useFlags()

  return (
    <div className="space-y-4">
      <PageHeader title="Feature flags" description="Toggle platform behaviour without a deploy." />
      <Card>
        <CardContent>
          {query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (query.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No feature flags.</p>
          ) : (
            query.data!.map((flag) => (
              <FlagRow key={flag.key} flag={flag} canWrite={canWrite} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
