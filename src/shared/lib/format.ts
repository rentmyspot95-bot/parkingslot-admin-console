import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

/**
 * Money is transmitted by the API in the smallest currency unit (paise for INR).
 * Render it as a localized currency string.
 */
export function formatMoney(
  minorAmount: number | null | undefined,
  currency = 'INR',
): string {
  if (minorAmount == null) return '—'
  const major = minorAmount / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(major)
}

/** Parse a rupee string the admin typed back into paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-IN').format(value)
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(fractionDigits)}%`
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  return typeof value === 'string' ? parseISO(value) : value
}

/** ISO-8601 UTC in, admin-locale date+time out, with an explicit tz hint. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return format(d, 'dd MMM yyyy, HH:mm')
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return format(d, 'dd MMM yyyy')
}

/** Financial timestamps get an explicit tz label per the design system. */
export function formatFinancialTimestamp(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return `${format(d, 'dd MMM yyyy, HH:mm')} (${tz})`
}

export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return `${formatDistanceToNowStrict(d)} ago`
}

/** A signed countdown to a future deadline, e.g. owner-approval response windows. */
export function formatCountdown(value: string | Date | null | undefined): {
  label: string
  expired: boolean
  urgent: boolean
} {
  const d = toDate(value)
  if (!d) return { label: '—', expired: false, urgent: false }
  const diffMs = d.getTime() - Date.now()
  const expired = diffMs <= 0
  const mins = Math.abs(Math.round(diffMs / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const body = h > 0 ? `${h}h ${m}m` : `${m}m`
  return {
    label: expired ? `expired ${body} ago` : `in ${body}`,
    expired,
    urgent: !expired && diffMs < 30 * 60000,
  }
}

export function truncate(text: string | null | undefined, max = 60): string {
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
