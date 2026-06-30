import { describe, expect, it } from 'vitest'
import { hasPermission, hasAnyPermission } from './permissions'

describe('hasPermission', () => {
  it('matches an exact grant', () => {
    expect(hasPermission(['payment.refund'], 'payment.refund')).toBe(true)
  })

  it('denies a missing grant', () => {
    expect(hasPermission(['user.read'], 'payment.refund')).toBe(false)
  })

  it('treats an uncapped wallet grant as satisfying the capped variant', () => {
    expect(hasPermission(['wallet.adjust'], 'wallet.adjust:capped')).toBe(true)
  })

  it('does not treat a capped grant as the uncapped one', () => {
    expect(hasPermission(['wallet.adjust:capped'], 'wallet.adjust')).toBe(false)
  })

  it('accepts a Set as the granted collection', () => {
    expect(hasPermission(new Set(['audit.read']), 'audit.read')).toBe(true)
  })
})

describe('hasAnyPermission', () => {
  it('is satisfied when any required permission is held', () => {
    expect(hasAnyPermission(['listing.read'], ['listing.approve', 'listing.read'])).toBe(true)
  })

  it('fails when none are held', () => {
    expect(hasAnyPermission(['user.read'], ['listing.approve', 'listing.read'])).toBe(false)
  })
})
