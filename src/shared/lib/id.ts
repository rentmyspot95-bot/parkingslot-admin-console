/** Generate a client-side idempotency key for money mutations (refunds, payouts, credits). */
export function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID.
  return 'idk_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}
