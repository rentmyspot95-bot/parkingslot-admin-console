/**
 * Permission catalogue (design doc §8). A permission is "domain.action[:scope]".
 * The SPA mirrors the server's map only to hide controls — the server remains
 * the security boundary and re-checks on every endpoint.
 */
export const PERMISSIONS = [
  'user.read',
  'user.suspend',
  'user.delete',
  'host.read',
  'host.verify',
  'host.suspend',
  'listing.read',
  'listing.approve',
  'listing.edit',
  'listing.takedown',
  'booking.read',
  'booking.cancel',
  'booking.override',
  'payment.read',
  'payment.refund',
  'payout.read',
  'payout.trigger',
  'payout.hold',
  'wallet.read',
  'wallet.adjust',
  'wallet.adjust:capped',
  'review.read',
  'review.moderate',
  'support.read',
  'support.reply',
  'support.assign',
  'notification.send',
  'config.read',
  'config.write',
  'admin.read',
  'admin.manage',
  'audit.read',
  'export.run',
] as const

export type Permission = (typeof PERMISSIONS)[number]

/** Grouping for the role editor UI (design doc §9.13). */
export const PERMISSION_GROUPS: { domain: string; permissions: Permission[] }[] = [
  { domain: 'Users', permissions: ['user.read', 'user.suspend', 'user.delete'] },
  { domain: 'Hosts', permissions: ['host.read', 'host.verify', 'host.suspend'] },
  {
    domain: 'Listings',
    permissions: ['listing.read', 'listing.approve', 'listing.edit', 'listing.takedown'],
  },
  { domain: 'Bookings', permissions: ['booking.read', 'booking.cancel', 'booking.override'] },
  { domain: 'Payments', permissions: ['payment.read', 'payment.refund'] },
  { domain: 'Payouts', permissions: ['payout.read', 'payout.trigger', 'payout.hold'] },
  { domain: 'Wallet', permissions: ['wallet.read', 'wallet.adjust', 'wallet.adjust:capped'] },
  { domain: 'Reviews', permissions: ['review.read', 'review.moderate'] },
  { domain: 'Support', permissions: ['support.read', 'support.reply', 'support.assign'] },
  { domain: 'Notifications', permissions: ['notification.send'] },
  { domain: 'Config', permissions: ['config.read', 'config.write'] },
  { domain: 'Admin', permissions: ['admin.read', 'admin.manage'] },
  { domain: 'Audit & Export', permissions: ['audit.read', 'export.run'] },
]

/**
 * Capped goodwill-credit ceiling (paise) for `wallet.adjust:capped` holders.
 * The server enforces the real cap; this mirrors it for client-side validation.
 */
export const CAPPED_WALLET_LIMIT_PAISE = 50000 // ₹500

/**
 * Does the effective permission set satisfy `required`?
 * `wallet.adjust` implies `wallet.adjust:capped`.
 */
export function hasPermission(
  granted: ReadonlySet<string> | readonly string[],
  required: Permission,
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted)
  if (set.has(required)) return true
  // Uncapped grant satisfies the capped variant.
  if (required === 'wallet.adjust:capped' && set.has('wallet.adjust')) return true
  return false
}

/** Satisfied if the admin holds ANY of the listed permissions. */
export function hasAnyPermission(
  granted: ReadonlySet<string> | readonly string[],
  required: readonly Permission[],
): boolean {
  return required.some((p) => hasPermission(granted, p))
}
