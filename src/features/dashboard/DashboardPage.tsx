import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  IndianRupee,
  CalendarCheck,
  MapPin,
  UserPlus,
  Percent,
  Banknote,
  ShieldAlert,
  Star,
  LifeBuoy,
  ClipboardCheck,
} from 'lucide-react'
import { useMetricsOverview, useMetricsTimeseries } from './api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  FilterSelect,
  PageHeader,
  Spinner,
} from '@/shared/ui'
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

function Kpi({
  icon: Icon,
  label,
  value,
  tone = 'brand',
}: {
  icon: typeof IndianRupee
  label: string
  value: string
  tone?: 'brand' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function QueueWidget({
  icon: Icon,
  label,
  count,
  to,
}: {
  icon: typeof ShieldAlert
  label: string
  count: number
  to: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-sm font-bold tabular-nums',
          count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </Link>
  )
}

export function DashboardPage() {
  const [range, setRange] = useState('30d')
  const overview = useMetricsOverview(range)
  const gmvSeries = useMetricsTimeseries('gmv', range)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Marketplace health and operational queues."
        actions={
          <FilterSelect label="Range" value={range} onChange={setRange} options={RANGES} />
        }
      />

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={IndianRupee} label="GMV" value={formatMoney(overview.data?.gmv)} tone="green" />
            <Kpi icon={CalendarCheck} label="Bookings (today)" value={formatNumber(overview.data?.bookingsToday)} />
            <Kpi icon={MapPin} label="Active listings" value={formatNumber(overview.data?.activeListings)} />
            <Kpi icon={UserPlus} label="New hosts (7d)" value={formatNumber(overview.data?.newHosts7d)} />
            <Kpi icon={CalendarCheck} label="Bookings (7d)" value={formatNumber(overview.data?.bookings7d)} />
            <Kpi icon={CalendarCheck} label="Bookings (30d)" value={formatNumber(overview.data?.bookings30d)} />
            <Kpi icon={Percent} label="Refund rate" value={formatPercent(overview.data?.refundRatePct)} tone="amber" />
            <Kpi icon={Banknote} label="Payout backlog" value={formatMoney(overview.data?.payoutBacklog)} tone="red" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>GMV trend</CardTitle>
              </CardHeader>
              <CardContent>
                {gmvSeries.isLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <Spinner />
                  </div>
                ) : gmvSeries.isError ? (
                  <ErrorState error={gmvSeries.error} onRetry={() => gmvSeries.refetch()} />
                ) : (
                  <ResponsiveContainer width="100%" height={256}>
                    <AreaChart data={gmvSeries.data?.points ?? []}>
                      <defs>
                        <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0055FF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0055FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="t"
                        tickFormatter={(t) => formatDate(t)}
                        fontSize={11}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        tickFormatter={(v) => formatMoney(v as number)}
                        fontSize={11}
                        stroke="#94a3b8"
                        width={70}
                      />
                      <Tooltip
                        formatter={(v) => formatMoney(v as number)}
                        labelFormatter={(t) => formatDate(t as string)}
                      />
                      <Area type="monotone" dataKey="value" stroke="#0055FF" fill="url(#gmv)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational queues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QueueWidget icon={ShieldAlert} label="Pending KYC" count={overview.data?.queues.pendingKyc ?? 0} to="/hosts?kycStatus=pending" />
                <QueueWidget icon={ClipboardCheck} label="Pending owner approval" count={overview.data?.queues.pendingOwnerApproval ?? 0} to="/booking-requests" />
                <QueueWidget icon={Star} label="Flagged reviews" count={overview.data?.queues.flaggedReviews ?? 0} to="/reviews?status=flagged" />
                <QueueWidget icon={LifeBuoy} label="Open support" count={overview.data?.queues.openSupport ?? 0} to="/support?status=open" />
                <QueueWidget icon={Banknote} label="On-hold payouts" count={overview.data?.queues.onHoldPayouts ?? 0} to="/payouts?status=on_hold" />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
