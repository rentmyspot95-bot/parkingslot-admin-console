import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from './providers'
import { AppShell } from './layout/AppShell'
import { RequireAuth, RequirePermission } from './guards'
import { useAuth } from '@/shared/auth/useAuth'
import type { Permission } from '@/shared/auth/permissions'

import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { UsersPage } from '@/features/users/UsersPage'
import { UserDetailPage } from '@/features/users/UserDetailPage'
import { HostsPage } from '@/features/hosts/HostsPage'
import { HostDetailPage } from '@/features/hosts/HostDetailPage'
import { ListingsPage } from '@/features/listings/ListingsPage'
import { ListingDetailPage } from '@/features/listings/ListingDetailPage'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { BookingDetailPage } from '@/features/bookings/BookingDetailPage'
import { BookingRequestsPage } from '@/features/bookings/BookingRequestsPage'
import { ReviewsPage } from '@/features/reviews/ReviewsPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'
import { PaymentDetailPage } from '@/features/payments/PaymentDetailPage'
import { RefundsPage } from '@/features/payments/RefundsPage'
import { PayoutsPage } from '@/features/payouts/PayoutsPage'
import { WalletPage } from '@/features/wallet/WalletPage'
import { SupportPage } from '@/features/support/SupportPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { ConfigPage } from '@/features/config/ConfigPage'
import { FeatureFlagsPage } from '@/features/config/FeatureFlagsPage'
import { AdminsPage } from '@/features/admins/AdminsPage'
import { AuditPage } from '@/features/audit/AuditPage'

/** Wrap an element with a permission gate. */
function Guarded({ anyOf, children }: { anyOf: Permission[]; children: React.ReactNode }) {
  return <RequirePermission anyOf={anyOf}>{children}</RequirePermission>
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { restore } = useAuth()
  useEffect(() => {
    void restore()
  }, [restore])
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AuthBootstrap>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />

              <Route path="users" element={<Guarded anyOf={['user.read']}><UsersPage /></Guarded>} />
              <Route path="users/:id" element={<Guarded anyOf={['user.read']}><UserDetailPage /></Guarded>} />

              <Route path="hosts" element={<Guarded anyOf={['host.read']}><HostsPage /></Guarded>} />
              <Route path="hosts/:id" element={<Guarded anyOf={['host.read']}><HostDetailPage /></Guarded>} />

              <Route path="listings" element={<Guarded anyOf={['listing.read']}><ListingsPage /></Guarded>} />
              <Route path="listings/:id" element={<Guarded anyOf={['listing.read']}><ListingDetailPage /></Guarded>} />

              <Route path="bookings" element={<Guarded anyOf={['booking.read']}><BookingsPage /></Guarded>} />
              <Route path="bookings/:id" element={<Guarded anyOf={['booking.read']}><BookingDetailPage /></Guarded>} />
              <Route path="booking-requests" element={<Guarded anyOf={['booking.read']}><BookingRequestsPage /></Guarded>} />

              <Route path="reviews" element={<Guarded anyOf={['review.read']}><ReviewsPage /></Guarded>} />

              <Route path="payments" element={<Guarded anyOf={['payment.read']}><PaymentsPage /></Guarded>} />
              <Route path="payments/:id" element={<Guarded anyOf={['payment.read']}><PaymentDetailPage /></Guarded>} />
              <Route path="refunds" element={<Guarded anyOf={['payment.read']}><RefundsPage /></Guarded>} />
              <Route path="payouts" element={<Guarded anyOf={['payout.read']}><PayoutsPage /></Guarded>} />
              <Route path="wallet" element={<Guarded anyOf={['wallet.read']}><WalletPage /></Guarded>} />

              <Route path="support" element={<Guarded anyOf={['support.read']}><SupportPage /></Guarded>} />
              <Route path="support/:id" element={<Guarded anyOf={['support.read']}><SupportPage /></Guarded>} />
              <Route path="notifications" element={<Guarded anyOf={['notification.send']}><NotificationsPage /></Guarded>} />

              <Route path="config" element={<Guarded anyOf={['config.read']}><ConfigPage /></Guarded>} />
              <Route path="flags" element={<Guarded anyOf={['config.read']}><FeatureFlagsPage /></Guarded>} />
              <Route path="admins" element={<Guarded anyOf={['admin.read']}><AdminsPage /></Guarded>} />
              <Route path="audit" element={<Guarded anyOf={['audit.read']}><AuditPage /></Guarded>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthBootstrap>
      </AppProviders>
    </BrowserRouter>
  )
}
