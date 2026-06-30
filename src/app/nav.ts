import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  MapPin,
  CalendarClock,
  ClipboardCheck,
  Star,
  CreditCard,
  Receipt,
  Banknote,
  Wallet,
  LifeBuoy,
  Megaphone,
  Settings,
  ToggleRight,
  UserCog,
  ScrollText,
} from 'lucide-react'
import type { Permission } from '@/shared/auth/permissions'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Item renders only if the admin holds at least one of these (empty = always). */
  anyOf: Permission[]
}

export interface NavGroup {
  label: string | null
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, anyOf: [] }],
  },
  {
    label: 'Marketplace',
    items: [
      { label: 'Users', to: '/users', icon: Users, anyOf: ['user.read'] },
      { label: 'Hosts', to: '/hosts', icon: ShieldCheck, anyOf: ['host.read'] },
      { label: 'Listings', to: '/listings', icon: MapPin, anyOf: ['listing.read'] },
      { label: 'Bookings', to: '/bookings', icon: CalendarClock, anyOf: ['booking.read'] },
      {
        label: 'Booking Requests',
        to: '/booking-requests',
        icon: ClipboardCheck,
        anyOf: ['booking.read'],
      },
      { label: 'Reviews', to: '/reviews', icon: Star, anyOf: ['review.read'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payments', to: '/payments', icon: CreditCard, anyOf: ['payment.read'] },
      { label: 'Refunds', to: '/refunds', icon: Receipt, anyOf: ['payment.read'] },
      { label: 'Payouts', to: '/payouts', icon: Banknote, anyOf: ['payout.read'] },
      { label: 'Wallet / Credits', to: '/wallet', icon: Wallet, anyOf: ['wallet.read'] },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { label: 'Support', to: '/support', icon: LifeBuoy, anyOf: ['support.read'] },
      { label: 'Notifications', to: '/notifications', icon: Megaphone, anyOf: ['notification.send'] },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Configuration', to: '/config', icon: Settings, anyOf: ['config.read'] },
      { label: 'Feature Flags', to: '/flags', icon: ToggleRight, anyOf: ['config.read'] },
      { label: 'Admin Users & Roles', to: '/admins', icon: UserCog, anyOf: ['admin.read'] },
      { label: 'Audit Log', to: '/audit', icon: ScrollText, anyOf: ['audit.read'] },
    ],
  },
]
