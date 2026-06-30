import type { BookingMode, Currency, ISODateString, VehicleType } from './common'

// Re-export the common primitives so feature code can import everything from one place.
export type { BookingMode, Currency, ISODateString, VehicleType } from './common'

// ── Users (Seekers) ────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'suspended' | 'deleted'

export interface Vehicle {
  type: VehicleType
  label: string
  plate?: string | null
}

export interface User {
  id: string
  phone: string
  name: string
  email?: string | null
  status: UserStatus
  vehicles: Vehicle[]
  walletCreditBalance: number
  createdAt: ISODateString
  lastActiveAt?: ISODateString | null
  bookingCount: number
  flagged: boolean
}

// ── Hosts (owner role on a user) ────────────────────────────────────────────
export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type HostStatus = 'active' | 'suspended'

export interface KycDoc {
  type: string
  url: string
  reviewedBy?: string | null
  reviewedAt?: ISODateString | null
}

export interface PayoutAccount {
  upi?: string | null
  bank?: { accountNumber: string; ifsc: string; name: string } | null
}

export interface Host {
  id: string
  userId: string
  displayName: string
  kycStatus: KycStatus
  kycDocs: KycDoc[]
  payoutAccount?: PayoutAccount | null
  listingCount: number
  rating?: number | null
  totalEarnings: number
  status: HostStatus
  createdAt: ISODateString
}

// ── Listings ────────────────────────────────────────────────────────────────
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected'

export interface Listing {
  id: string
  hostId: string
  hostName?: string | null
  title: string
  address: string
  geo: { lat: number; lng: number }
  photos: string[]
  amenities: string[]
  vehicleTypes: VehicleType[]
  pricePerHour: number
  pricePerDay?: number | null
  bookingMode: BookingMode
  availabilityRules?: unknown
  status: ListingStatus
  moderationNote?: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ── Bookings ─────────────────────────────────────────────────────────────────
export type BookingStatus =
  | 'requested'
  | 'pending_owner_approval'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'rejected'
  | 'auto_rejected'
  | 'expired'
  | 'cancelled'
  | 'disputed'

export type OwnerDecision = 'approved' | 'rejected'

export interface Booking {
  id: string
  listingId: string
  listingTitle?: string | null
  seekerId: string
  seekerName?: string | null
  hostId: string
  hostName?: string | null
  slot: { start: ISODateString; end: ISODateString }
  vehicleType: VehicleType
  bayId?: string | null
  amount: number
  currency: Currency
  commission: number
  netToHost: number
  status: BookingStatus
  bookingMode: BookingMode
  // Owner-approval (request_to_book only):
  ownerDecision?: OwnerDecision | null
  ownerRejectReason?: string | null
  responseDeadline?: ISODateString | null
  decidedAt?: ISODateString | null
  autoRejected: boolean
  paymentId?: string | null
  createdAt: ISODateString
  cancelledBy?: string | null
  cancelReason?: string | null
}

export interface OwnerApprovalStats {
  hostId: string
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  autoRejectedCount: number
  avgResponseMinutes?: number | null
  rejectionRate: number
}

// ── Payments & Refunds ───────────────────────────────────────────────────────
export type PaymentStatus =
  | 'created'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'

export interface Refund {
  id: string
  amount: number
  reason: string
  by?: string | null
  at: ISODateString
}

export interface Payment {
  id: string
  bookingId: string
  gateway: 'razorpay'
  gatewayPaymentId?: string | null
  amount: number
  currency: Currency
  status: PaymentStatus
  refunds: Refund[]
  createdAt: ISODateString
}

// ── Payouts ──────────────────────────────────────────────────────────────────
export type PayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed' | 'on_hold'

export interface Payout {
  id: string
  hostId: string
  hostName?: string | null
  period: { from: ISODateString; to: ISODateString }
  grossEarnings: number
  commission: number
  netPayable: number
  status: PayoutStatus
  method?: string | null
  reference?: string | null
  triggeredBy?: string | null
  createdAt: ISODateString
  paidAt?: ISODateString | null
}

// ── Wallet ───────────────────────────────────────────────────────────────────
export type WalletTxnType = 'credit' | 'debit' | 'adjustment'

export interface WalletTransaction {
  id: string
  userId: string
  type: WalletTxnType
  amount: number
  reason: string
  relatedBookingId?: string | null
  issuedBy?: string | null
  balanceAfter: number
  createdAt: ISODateString
}

// ── Reviews ──────────────────────────────────────────────────────────────────
export type ReviewStatus = 'visible' | 'hidden' | 'flagged' | 'removed'

export interface Review {
  id: string
  listingId: string
  listingTitle?: string | null
  seekerId: string
  seekerName?: string | null
  rating: number
  text?: string | null
  status: ReviewStatus
  moderatedBy?: string | null
  moderationReason?: string | null
  createdAt: ISODateString
}

// ── Support ──────────────────────────────────────────────────────────────────
export type SupportThreadStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface SupportMessage {
  id: string
  threadId: string
  senderType: 'user' | 'agent' | 'system'
  senderId?: string | null
  senderName?: string | null
  body: string
  createdAt: ISODateString
}

export interface SupportThread {
  id: string
  userId: string
  userName?: string | null
  subject: string
  category?: string | null
  status: SupportThreadStatus
  assigneeAdminId?: string | null
  assigneeName?: string | null
  priority: SupportPriority
  lastMessageAt?: ISODateString | null
  createdAt: ISODateString
}

// ── Notifications ────────────────────────────────────────────────────────────
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'

export interface NotificationCampaign {
  id: string
  title: string
  body: string
  deepLinkType: string
  audience: { segment?: string | null; userIds?: string[] | null }
  scheduledAt?: ISODateString | null
  status: CampaignStatus
  sentCount: number
  createdBy?: string | null
  createdAt: ISODateString
}

// ── Config & Feature Flags ───────────────────────────────────────────────────
export interface PlatformConfig {
  commissionRatePct: number
  ownerResponseWindowMinutes: number
  cancellationWindowHours: number
  refundPolicy: string
  minPricePerHour: number
  maxPricePerHour: number
  supportedCities: string[]
  defaultBookingMode: BookingMode
  [key: string]: unknown
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string | null
  updatedBy?: string | null
  updatedAt?: ISODateString | null
}

// ── Admin Users & Roles ──────────────────────────────────────────────────────
export type AdminStatus = 'active' | 'disabled'

export interface AdminUser {
  id: string
  email: string
  name: string
  status: AdminStatus
  roles: string[]
  totpEnabled: boolean
  lastLoginAt?: ISODateString | null
  createdAt: ISODateString
}

export interface Role {
  id: string
  name: string
  permissions: string[]
}

// ── Audit Log ────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string
  actorAdminId: string
  actorName?: string | null
  action: string
  targetType: string
  targetId: string
  reason?: string | null
  metadata?: { before?: unknown; after?: unknown } | null
  ip?: string | null
  requestId?: string | null
  createdAt: ISODateString
}

// ── Dashboard metrics ────────────────────────────────────────────────────────
export interface MetricsOverview {
  gmv: number
  bookingsToday: number
  bookings7d: number
  bookings30d: number
  activeListings: number
  newHosts7d: number
  refundRatePct: number
  payoutBacklog: number
  queues: {
    pendingKyc: number
    flaggedReviews: number
    openSupport: number
    onHoldPayouts: number
    pendingOwnerApproval: number
  }
}

export interface TimeseriesPoint {
  t: ISODateString
  value: number
}

export interface MetricsTimeseries {
  metric: string
  range: string
  points: TimeseriesPoint[]
}
