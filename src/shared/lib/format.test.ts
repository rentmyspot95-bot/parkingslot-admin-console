import { describe, expect, it } from 'vitest'
import { formatMoney, rupeesToPaise } from './format'

describe('formatMoney', () => {
  it('renders paise as rupees', () => {
    // 12000 paise = ₹120
    expect(formatMoney(12000)).toContain('120')
  })

  it('renders an em dash for nullish amounts', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })
})

describe('rupeesToPaise', () => {
  it('converts rupees to integer paise', () => {
    expect(rupeesToPaise(120)).toBe(12000)
    expect(rupeesToPaise(99.99)).toBe(9999)
  })
})
