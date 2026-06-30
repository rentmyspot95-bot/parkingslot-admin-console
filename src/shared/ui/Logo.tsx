import mark from '@/assets/parkingslot-mark.png'
import wordmarkWhite from '@/assets/parkingslot-logo-white.png'
import { cn } from '../lib/cn'

/**
 * ParkingSlot brand artwork (from the canonical wireframes).
 * - "mark"      → the blue/lime pin icon, for light surfaces (sidebar, favicon).
 * - "fullWhite" → the white vertical lockup (mark + wordmark), for dark surfaces (login).
 */
export function Logo({
  variant = 'mark',
  className,
  alt = 'ParkingSlot',
}: {
  variant?: 'mark' | 'fullWhite'
  className?: string
  alt?: string
}) {
  const src = variant === 'fullWhite' ? wordmarkWhite : mark
  return <img src={src} alt={alt} className={cn('object-contain', className)} draggable={false} />
}
