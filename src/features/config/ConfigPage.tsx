import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Select,
  Textarea,
  toast,
} from '@/shared/ui'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useCan } from '@/shared/auth/useAuth'
import { formatMoney, rupeesToPaise } from '@/shared/lib/format'
import { BOOKING_MODE_LABELS, type BookingMode } from '@/shared/types/common'
import type { PlatformConfig } from '@/shared/types/domain'
import { useConfig, useUpdateConfig } from './api'

/** Editable form state. Prices are entered in rupees but stored as paise. */
interface FormState {
  commissionRatePct: string
  ownerResponseWindowMinutes: string
  cancellationWindowHours: string
  refundPolicy: string
  minPricePerHourRupees: string
  maxPricePerHourRupees: string
  supportedCities: string
  defaultBookingMode: BookingMode
}

function toForm(c: PlatformConfig): FormState {
  return {
    commissionRatePct: String(c.commissionRatePct),
    ownerResponseWindowMinutes: String(c.ownerResponseWindowMinutes),
    cancellationWindowHours: String(c.cancellationWindowHours),
    refundPolicy: c.refundPolicy,
    minPricePerHourRupees: String(c.minPricePerHour / 100),
    maxPricePerHourRupees: String(c.maxPricePerHour / 100),
    supportedCities: c.supportedCities.join(', '),
    defaultBookingMode: c.defaultBookingMode,
  }
}

function toConfig(current: PlatformConfig, form: FormState): PlatformConfig {
  return {
    ...current,
    commissionRatePct: Number(form.commissionRatePct),
    ownerResponseWindowMinutes: Number(form.ownerResponseWindowMinutes),
    cancellationWindowHours: Number(form.cancellationWindowHours),
    refundPolicy: form.refundPolicy,
    minPricePerHour: rupeesToPaise(Number(form.minPricePerHourRupees)),
    maxPricePerHour: rupeesToPaise(Number(form.maxPricePerHourRupees)),
    supportedCities: form.supportedCities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    defaultBookingMode: form.defaultBookingMode,
  }
}

interface DiffEntry {
  key: string
  before: string
  after: string
}

const PRICE_KEYS = new Set(['minPricePerHour', 'maxPricePerHour'])

function fmt(key: string, value: unknown): string {
  if (PRICE_KEYS.has(key)) return formatMoney(value as number)
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function diffConfig(before: PlatformConfig, after: PlatformConfig): DiffEntry[] {
  const keys: (keyof PlatformConfig)[] = [
    'commissionRatePct',
    'ownerResponseWindowMinutes',
    'cancellationWindowHours',
    'refundPolicy',
    'minPricePerHour',
    'maxPricePerHour',
    'supportedCities',
    'defaultBookingMode',
  ]
  const out: DiffEntry[] = []
  for (const k of keys) {
    const key = String(k)
    const b = fmt(key, before[k])
    const a = fmt(key, after[k])
    if (b !== a) out.push({ key, before: b, after: a })
  }
  return out
}

const BOOKING_MODES = Object.keys(BOOKING_MODE_LABELS) as BookingMode[]

export function ConfigPage() {
  const canWrite = useCan('config.write')
  const query = useConfig()
  const update = useUpdateConfig()
  const [form, setForm] = useState<FormState | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (query.data) setForm(toForm(query.data))
  }, [query.data])

  const edited = useMemo(
    () => (query.data && form ? toConfig(query.data, form) : null),
    [query.data, form],
  )
  const diff = useMemo(
    () => (query.data && edited ? diffConfig(query.data, edited) : []),
    [query.data, edited],
  )

  if (query.isLoading || !form) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  function save(reason: string) {
    if (!edited) return
    update.mutate(
      { config: edited, reason },
      {
        onSuccess: () => {
          toast.success('Config updated')
          setConfirmOpen(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  const ro = !canWrite

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Platform configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Commission rate (%)">
            <Input
              type="number"
              value={form.commissionRatePct}
              onChange={(e) => set('commissionRatePct', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Owner response window / auto-reject timeout (minutes)">
            <Input
              type="number"
              value={form.ownerResponseWindowMinutes}
              onChange={(e) => set('ownerResponseWindowMinutes', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Cancellation window (hours)">
            <Input
              type="number"
              value={form.cancellationWindowHours}
              onChange={(e) => set('cancellationWindowHours', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Default booking mode">
            <Select
              value={form.defaultBookingMode}
              onChange={(e) => set('defaultBookingMode', e.target.value as BookingMode)}
              disabled={ro}
            >
              {BOOKING_MODES.map((m) => (
                <option key={m} value={m}>
                  {BOOKING_MODE_LABELS[m]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Min price per hour (₹)" hint="Stored as paise.">
            <Input
              type="number"
              value={form.minPricePerHourRupees}
              onChange={(e) => set('minPricePerHourRupees', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Max price per hour (₹)" hint="Stored as paise.">
            <Input
              type="number"
              value={form.maxPricePerHourRupees}
              onChange={(e) => set('maxPricePerHourRupees', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Supported cities" hint="Comma-separated." className="md:col-span-2">
            <Input
              value={form.supportedCities}
              onChange={(e) => set('supportedCities', e.target.value)}
              disabled={ro}
            />
          </FormField>
          <FormField label="Refund policy" className="md:col-span-2">
            <Textarea
              value={form.refundPolicy}
              onChange={(e) => set('refundPolicy', e.target.value)}
              disabled={ro}
            />
          </FormField>
        </CardContent>
      </Card>

      {canWrite && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">
            {diff.length === 0 ? 'No changes' : `${diff.length} change(s)`}
          </span>
          <Button onClick={() => setConfirmOpen(true)} disabled={diff.length === 0}>
            Save changes
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title="Apply config changes?"
        description="Review the diff below. A reason is recorded in the audit log."
        confirmLabel="Apply changes"
        requireReason
        reasonLabel="Reason for change"
        loading={update.isPending}
      >
        <div className="mb-3 space-y-2">
          {diff.map((d) => (
            <div key={d.key} className="rounded-md border border-border p-2 text-sm">
              <p className="font-medium">{d.key}</p>
              <p className="text-xs">
                <span className="text-red-600 line-through">{d.before}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className="text-green-700">{d.after}</span>
              </p>
            </div>
          ))}
        </div>
      </ConfirmDialog>
    </div>
  )
}
