/**
 * Dev-only fixture data for the mock API (see ./install.ts).
 * Money values are in paise (minor units), matching the real API convention.
 * None of this ships when VITE_USE_MOCK is off.
 */
import { PERMISSIONS } from '../auth/permissions'
import type {
  AdminUser,
  AuditLogEntry,
  Booking,
  FeatureFlag,
  Host,
  Listing,
  NotificationCampaign,
  Payment,
  Payout,
  PlatformConfig,
  Review,
  Role,
  SupportMessage,
  SupportThread,
  User,
  WalletTransaction,
} from '../types/domain'

const now = Date.now()
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
const hoursAhead = (h: number) => new Date(now + h * 3_600_000).toISOString()
const minsAhead = (m: number) => new Date(now + m * 60_000).toISOString()

export const MOCK_ADMIN = {
  id: 'adm_1',
  email: 'admin@parkingslot.com',
  name: 'Ava Operator',
  roles: ['Super Admin'],
  permissions: [...PERMISSIONS] as string[],
}

export const users: User[] = [
  {
    id: 'usr_1',
    phone: '+919800000001',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    status: 'active',
    vehicles: [{ type: 'car', label: 'Sedan', plate: 'KA01AB1234' }],
    walletCreditBalance: 25000,
    createdAt: daysAgo(120),
    lastActiveAt: daysAgo(1),
    bookingCount: 14,
    flagged: false,
  },
  {
    id: 'usr_2',
    phone: '+919800000002',
    name: 'Priya Nair',
    email: 'priya@example.com',
    status: 'active',
    vehicles: [{ type: 'bike', label: '2-Wheeler', plate: 'KA05CD5678' }],
    walletCreditBalance: 0,
    createdAt: daysAgo(80),
    lastActiveAt: daysAgo(3),
    bookingCount: 7,
    flagged: true,
  },
  {
    id: 'usr_3',
    phone: '+919800000003',
    name: 'Imran Khan',
    email: null,
    status: 'suspended',
    vehicles: [],
    walletCreditBalance: 5000,
    createdAt: daysAgo(40),
    lastActiveAt: daysAgo(10),
    bookingCount: 2,
    flagged: false,
  },
  {
    id: 'usr_4',
    phone: '+919800000004',
    name: 'Sneha Reddy',
    email: 'sneha@example.com',
    status: 'active',
    vehicles: [
      { type: 'car', label: 'Hatchback', plate: 'KA03EF9012' },
      { type: 'bike', label: '2-Wheeler' },
    ],
    walletCreditBalance: 50000,
    createdAt: daysAgo(15),
    lastActiveAt: daysAgo(0),
    bookingCount: 1,
    flagged: false,
  },
]

export const hosts: Host[] = [
  {
    id: 'hst_1',
    userId: 'usr_1',
    displayName: 'Rahul (MG Road Garage)',
    kycStatus: 'verified',
    kycDocs: [
      { type: 'aadhaar', url: 'https://placehold.co/600x400?text=Aadhaar', reviewedBy: 'adm_1', reviewedAt: daysAgo(100) },
      { type: 'property_proof', url: 'https://placehold.co/600x400?text=Property+Proof', reviewedBy: 'adm_1', reviewedAt: daysAgo(100) },
    ],
    payoutAccount: { upi: 'rahul@upi' },
    listingCount: 2,
    rating: 4.6,
    totalEarnings: 1240000,
    status: 'active',
    createdAt: daysAgo(110),
  },
  {
    id: 'hst_2',
    userId: 'usr_4',
    displayName: 'Sneha (Indiranagar)',
    kycStatus: 'pending',
    kycDocs: [
      { type: 'aadhaar', url: 'https://placehold.co/600x400?text=Aadhaar' },
      { type: 'selfie', url: 'https://placehold.co/600x400?text=Selfie' },
    ],
    payoutAccount: { bank: { accountNumber: '00112233445', ifsc: 'HDFC0001234', name: 'Sneha Reddy' } },
    listingCount: 1,
    rating: null,
    totalEarnings: 0,
    status: 'active',
    createdAt: daysAgo(12),
  },
]

export const listings: Listing[] = [
  {
    id: 'lst_1',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    title: 'Covered parking near MG Road Metro',
    address: '12 MG Road, Bengaluru 560001',
    geo: { lat: 12.9756, lng: 77.6068 },
    photos: ['https://placehold.co/800x500?text=Parking+1', 'https://placehold.co/800x500?text=Parking+2'],
    amenities: ['Covered', 'CCTV', 'EV charging'],
    vehicleTypes: ['car', 'bike'],
    pricePerHour: 4000,
    pricePerDay: 30000,
    bookingMode: 'instant_book',
    status: 'active',
    createdAt: daysAgo(105),
    updatedAt: daysAgo(2),
  },
  {
    id: 'lst_2',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    title: 'Driveway spot, 100m from 100ft Road',
    address: '4 Indiranagar, Bengaluru 560038',
    geo: { lat: 12.9719, lng: 77.6412 },
    photos: ['https://placehold.co/800x500?text=Driveway'],
    amenities: ['Gated'],
    vehicleTypes: ['car'],
    pricePerHour: 3000,
    pricePerDay: null,
    bookingMode: 'request_to_book',
    status: 'pending_review',
    moderationNote: null,
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
  },
]

export const bookings: Booking[] = [
  {
    id: 'bkg_1',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_2',
    seekerName: 'Priya Nair',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    slot: { start: daysAgo(2), end: daysAgo(2) },
    vehicleType: 'bike',
    bayId: 'B-04',
    amount: 12000,
    currency: 'INR',
    commission: 2400,
    netToHost: 9600,
    status: 'completed',
    bookingMode: 'instant_book',
    autoRejected: false,
    paymentId: 'pay_1',
    createdAt: daysAgo(2),
  },
  {
    id: 'bkg_2',
    listingId: 'lst_2',
    listingTitle: 'Driveway spot, 100m from 100ft Road',
    seekerId: 'usr_1',
    seekerName: 'Rahul Sharma',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    slot: { start: hoursAhead(6), end: hoursAhead(10) },
    vehicleType: 'car',
    amount: 12000,
    currency: 'INR',
    commission: 2400,
    netToHost: 9600,
    status: 'pending_owner_approval',
    bookingMode: 'request_to_book',
    responseDeadline: minsAhead(22),
    autoRejected: false,
    paymentId: 'pay_2',
    createdAt: minsAhead(-38),
  },
  {
    id: 'bkg_3',
    listingId: 'lst_2',
    listingTitle: 'Driveway spot, 100m from 100ft Road',
    seekerId: 'usr_4',
    seekerName: 'Sneha Reddy',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    slot: { start: daysAgo(1), end: daysAgo(1) },
    vehicleType: 'car',
    amount: 9000,
    currency: 'INR',
    commission: 1800,
    netToHost: 7200,
    status: 'auto_rejected',
    bookingMode: 'request_to_book',
    ownerRejectReason: null,
    responseDeadline: daysAgo(1),
    autoRejected: true,
    paymentId: 'pay_3',
    createdAt: daysAgo(1),
  },
  {
    id: 'bkg_4',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_3',
    seekerName: 'Imran Khan',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    slot: { start: hoursAhead(2), end: hoursAhead(5) },
    vehicleType: 'car',
    amount: 15000,
    currency: 'INR',
    commission: 3000,
    netToHost: 12000,
    status: 'disputed',
    bookingMode: 'instant_book',
    autoRejected: false,
    paymentId: 'pay_4',
    createdAt: daysAgo(3),
  },
]

export const payments: Payment[] = [
  {
    id: 'pay_1',
    bookingId: 'bkg_1',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_AbC123',
    amount: 12000,
    currency: 'INR',
    status: 'captured',
    refunds: [],
    createdAt: daysAgo(2),
  },
  {
    id: 'pay_2',
    bookingId: 'bkg_2',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_DeF456',
    amount: 12000,
    currency: 'INR',
    status: 'authorized',
    refunds: [],
    createdAt: minsAhead(-38),
  },
  {
    id: 'pay_3',
    bookingId: 'bkg_3',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_GhI789',
    amount: 9000,
    currency: 'INR',
    status: 'refunded',
    refunds: [{ id: 'rfnd_1', amount: 9000, reason: 'Auto-rejected request', by: 'adm_1', at: daysAgo(1) }],
    createdAt: daysAgo(1),
  },
  {
    id: 'pay_4',
    bookingId: 'bkg_4',
    gateway: 'razorpay',
    gatewayPaymentId: 'rzp_pay_JkL012',
    amount: 15000,
    currency: 'INR',
    status: 'partially_refunded',
    refunds: [{ id: 'rfnd_2', amount: 5000, reason: 'Partial goodwill', by: 'adm_1', at: daysAgo(2) }],
    createdAt: daysAgo(3),
  },
]

export const refunds = [
  { id: 'rfnd_1', paymentId: 'pay_3', bookingId: 'bkg_3', amount: 9000, reason: 'Auto-rejected request', status: 'processed', by: 'adm_1', at: daysAgo(1) },
  { id: 'rfnd_2', paymentId: 'pay_4', bookingId: 'bkg_4', amount: 5000, reason: 'Partial goodwill', status: 'processed', by: 'adm_1', at: daysAgo(2) },
]

export const payouts: Payout[] = [
  {
    id: 'pyt_1',
    hostId: 'hst_1',
    hostName: 'Rahul (MG Road Garage)',
    period: { from: daysAgo(37), to: daysAgo(7) },
    grossEarnings: 1240000,
    commission: 248000,
    netPayable: 992000,
    status: 'paid',
    method: 'UPI',
    reference: 'UTR123456',
    triggeredBy: 'adm_1',
    createdAt: daysAgo(6),
    paidAt: daysAgo(5),
  },
  {
    id: 'pyt_2',
    hostId: 'hst_2',
    hostName: 'Sneha (Indiranagar)',
    period: { from: daysAgo(37), to: daysAgo(7) },
    grossEarnings: 72000,
    commission: 14400,
    netPayable: 57600,
    status: 'on_hold',
    method: 'Bank',
    reference: null,
    createdAt: daysAgo(6),
    paidAt: null,
  },
]

export const walletTxns: Record<string, WalletTransaction[]> = {
  usr_1: [
    { id: 'wtx_1', userId: 'usr_1', type: 'credit', amount: 25000, reason: 'Apology credit — host cancelled', issuedBy: 'adm_1', balanceAfter: 25000, createdAt: daysAgo(20) },
  ],
  usr_3: [
    { id: 'wtx_2', userId: 'usr_3', type: 'credit', amount: 10000, reason: 'Campaign credit', issuedBy: 'adm_1', balanceAfter: 10000, createdAt: daysAgo(30) },
    { id: 'wtx_3', userId: 'usr_3', type: 'debit', amount: 5000, reason: 'Used on booking bkg_x', relatedBookingId: 'bkg_x', balanceAfter: 5000, createdAt: daysAgo(25) },
  ],
}

export const reviews: Review[] = [
  {
    id: 'rev_1',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_2',
    seekerName: 'Priya Nair',
    rating: 2,
    text: 'Spot was blocked when I arrived, had to wait 20 minutes.',
    status: 'flagged',
    createdAt: daysAgo(2),
  },
  {
    id: 'rev_2',
    listingId: 'lst_1',
    listingTitle: 'Covered parking near MG Road Metro',
    seekerId: 'usr_1',
    seekerName: 'Rahul Sharma',
    rating: 5,
    text: 'Great, secure and easy to find.',
    status: 'visible',
    createdAt: daysAgo(8),
  },
]

export const supportThreads: SupportThread[] = [
  {
    id: 'sup_1',
    userId: 'usr_2',
    userName: 'Priya Nair',
    subject: 'Refund not received',
    category: 'payment',
    status: 'open',
    assigneeAdminId: null,
    assigneeName: null,
    priority: 'high',
    lastMessageAt: minsAhead(-12),
    createdAt: daysAgo(1),
  },
  {
    id: 'sup_2',
    userId: 'usr_1',
    userName: 'Rahul Sharma',
    subject: 'How do I change my payout UPI?',
    category: 'account',
    status: 'pending',
    assigneeAdminId: 'adm_1',
    assigneeName: 'Ava Operator',
    priority: 'normal',
    lastMessageAt: daysAgo(1),
    createdAt: daysAgo(2),
  },
]

export const supportMessages: Record<string, SupportMessage[]> = {
  sup_1: [
    { id: 'msg_1', threadId: 'sup_1', senderType: 'user', senderId: 'usr_2', senderName: 'Priya Nair', body: 'I was auto-rejected but still charged. Where is my refund?', createdAt: daysAgo(1) },
    { id: 'msg_2', threadId: 'sup_1', senderType: 'system', body: 'Ticket created · category: payment', createdAt: daysAgo(1) },
    { id: 'msg_3', threadId: 'sup_1', senderType: 'user', senderId: 'usr_2', senderName: 'Priya Nair', body: 'Any update?', createdAt: minsAhead(-12) },
  ],
  sup_2: [
    { id: 'msg_4', threadId: 'sup_2', senderType: 'user', senderId: 'usr_1', senderName: 'Rahul Sharma', body: 'I need to update my UPI ID for payouts.', createdAt: daysAgo(2) },
    { id: 'msg_5', threadId: 'sup_2', senderType: 'agent', senderId: 'adm_1', senderName: 'Ava Operator', body: 'Happy to help — can you confirm the new UPI handle?', createdAt: daysAgo(1) },
  ],
}

export const campaigns: NotificationCampaign[] = [
  {
    id: 'cmp_1',
    title: 'Monsoon offer — ₹50 credit',
    body: 'Park dry this monsoon. ₹50 credit on your next booking.',
    deepLinkType: 'wallet',
    audience: { segment: 'all_users' },
    scheduledAt: null,
    status: 'sent',
    sentCount: 10423,
    createdBy: 'adm_1',
    createdAt: daysAgo(9),
  },
  {
    id: 'cmp_2',
    title: 'Win-back inactive seekers',
    body: 'We miss you! Here is ₹30 to come back.',
    deepLinkType: 'home',
    audience: { segment: 'inactive_30d' },
    scheduledAt: hoursAhead(20),
    status: 'scheduled',
    sentCount: 0,
    createdBy: 'adm_1',
    createdAt: daysAgo(1),
  },
]

export const config: PlatformConfig = {
  commissionRatePct: 20,
  ownerResponseWindowMinutes: 60,
  cancellationWindowHours: 2,
  refundPolicy: 'Full refund if cancelled >2h before slot; 50% within 2h; none after start.',
  minPricePerHour: 1000,
  maxPricePerHour: 20000,
  supportedCities: ['Bengaluru', 'Hyderabad', 'Pune'],
  defaultBookingMode: 'instant_book',
}

export const flags: FeatureFlag[] = [
  { key: 'instant_book_rollout', enabled: true, description: 'Enable instant-book listings', updatedBy: 'adm_1', updatedAt: daysAgo(30) },
  { key: 'default_request_to_book', enabled: false, description: 'New listings default to request-to-book', updatedBy: 'adm_1', updatedAt: daysAgo(15) },
  { key: 'new_payment_methods', enabled: false, description: 'Show UPI Autopay at checkout', updatedBy: null, updatedAt: null },
]

export const admins: AdminUser[] = [
  { id: 'adm_1', email: 'admin@parkingslot.com', name: 'Ava Operator', status: 'active', roles: ['Super Admin'], totpEnabled: true, lastLoginAt: minsAhead(-2), createdAt: daysAgo(200) },
  { id: 'adm_2', email: 'finance@parkingslot.com', name: 'Finn Ledger', status: 'active', roles: ['Finance'], totpEnabled: true, lastLoginAt: daysAgo(1), createdAt: daysAgo(150) },
  { id: 'adm_3', email: 'support@parkingslot.com', name: 'Sam Helper', status: 'disabled', roles: ['Support Agent'], totpEnabled: false, lastLoginAt: daysAgo(20), createdAt: daysAgo(90) },
]

export const roles: Role[] = [
  { id: 'role_super', name: 'Super Admin', permissions: [...PERMISSIONS] as string[] },
  { id: 'role_ops', name: 'Operations', permissions: ['user.read', 'user.suspend', 'host.read', 'host.verify', 'listing.read', 'listing.approve', 'booking.read', 'booking.cancel'] },
  { id: 'role_finance', name: 'Finance', permissions: ['payment.read', 'payment.refund', 'payout.read', 'payout.trigger', 'payout.hold', 'wallet.read', 'wallet.adjust', 'booking.read'] },
  { id: 'role_support', name: 'Support Agent', permissions: ['support.read', 'support.reply', 'support.assign', 'booking.read', 'wallet.adjust:capped', 'user.read'] },
]

export const audit: AuditLogEntry[] = [
  { id: 'aud_1', actorAdminId: 'adm_1', actorName: 'Ava Operator', action: 'payment.refund', targetType: 'payment', targetId: 'pay_3', reason: 'Auto-rejected request', metadata: { before: { status: 'captured' }, after: { status: 'refunded' } }, ip: '10.0.0.5', requestId: 'req_aud1', createdAt: daysAgo(1) },
  { id: 'aud_2', actorAdminId: 'adm_1', actorName: 'Ava Operator', action: 'host.kyc.approve', targetType: 'host', targetId: 'hst_1', reason: null, metadata: { before: { kycStatus: 'pending' }, after: { kycStatus: 'verified' } }, ip: '10.0.0.5', requestId: 'req_aud2', createdAt: daysAgo(100) },
  { id: 'aud_3', actorAdminId: 'adm_2', actorName: 'Finn Ledger', action: 'payout.trigger', targetType: 'payout', targetId: 'pyt_1', reason: 'Monthly settlement', metadata: { before: { status: 'scheduled' }, after: { status: 'paid' } }, ip: '10.0.0.9', requestId: 'req_aud3', createdAt: daysAgo(5) },
]

export function metricsOverview() {
  return {
    gmv: 4820000,
    bookingsToday: 23,
    bookings7d: 162,
    bookings30d: 689,
    activeListings: altCount(listings, 'active'),
    newHosts7d: 1,
    refundRatePct: 3.4,
    payoutBacklog: 57600,
    queues: {
      pendingKyc: hosts.filter((h) => h.kycStatus === 'pending').length,
      flaggedReviews: reviews.filter((r) => r.status === 'flagged').length,
      openSupport: supportThreads.filter((t) => t.status === 'open').length,
      onHoldPayouts: payouts.filter((p) => p.status === 'on_hold').length,
      pendingOwnerApproval: bookings.filter((b) => b.status === 'pending_owner_approval').length,
    },
  }
}

function altCount(arr: { status: string }[], status: string) {
  return arr.filter((x) => x.status === status).length
}

export function timeseries(metric: string) {
  const points = Array.from({ length: 30 }, (_, i) => {
    const base = metric === 'gmv' ? 120000 : 20
    const wobble = Math.round(base * (0.6 + 0.5 * Math.abs(Math.sin(i / 3))))
    return { t: daysAgo(29 - i), value: wobble }
  })
  return { metric, range: '30d', points }
}

export function globalSearch(q: string) {
  const ql = q.toLowerCase()
  const out: { type: string; id: string; label: string; sublabel?: string }[] = []
  users.filter((u) => u.name.toLowerCase().includes(ql) || u.phone.includes(q) || (u.email ?? '').includes(ql)).forEach((u) => out.push({ type: 'user', id: u.id, label: u.name, sublabel: u.phone }))
  hosts.filter((h) => h.displayName.toLowerCase().includes(ql)).forEach((h) => out.push({ type: 'host', id: h.id, label: h.displayName }))
  listings.filter((l) => l.title.toLowerCase().includes(ql)).forEach((l) => out.push({ type: 'listing', id: l.id, label: l.title, sublabel: l.address }))
  bookings.filter((b) => b.id.includes(ql)).forEach((b) => out.push({ type: 'booking', id: b.id, label: b.id, sublabel: b.listingTitle ?? '' }))
  return out.slice(0, 8)
}
