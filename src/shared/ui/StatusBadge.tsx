import { Badge, type BadgeTone } from './Badge'

/**
 * Central status → (tone, label) map. Status is conveyed by colour AND label
 * (never colour alone) per the design system accessibility rule.
 * pending = amber · active/paid = green · failed/rejected = red · draft/paused = grey.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  // generic
  active: 'green',
  paid: 'green',
  verified: 'green',
  completed: 'green',
  confirmed: 'green',
  visible: 'green',
  resolved: 'green',
  sent: 'green',
  enabled: 'green',

  pending: 'amber',
  pending_review: 'amber',
  pending_owner_approval: 'amber',
  processing: 'amber',
  scheduled: 'amber',
  authorized: 'amber',
  sending: 'amber',
  flagged: 'amber',
  on_hold: 'amber',
  open: 'amber',
  disputed: 'amber',

  failed: 'red',
  rejected: 'red',
  auto_rejected: 'red',
  removed: 'red',
  suspended: 'red',
  deleted: 'red',
  disabled: 'red',
  urgent: 'red',

  draft: 'grey',
  paused: 'grey',
  hidden: 'grey',
  expired: 'grey',
  cancelled: 'grey',
  closed: 'grey',
  unverified: 'grey',
  inactive: 'grey',

  captured: 'blue',
  refunded: 'blue',
  partially_refunded: 'blue',
  requested: 'blue',
  high: 'blue',
}

function humanize(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONES[status] ?? 'neutral'
  return <Badge tone={tone}>{label ?? humanize(status)}</Badge>
}
