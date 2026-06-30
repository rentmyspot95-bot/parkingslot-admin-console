import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, PanelLeft, LogOut } from 'lucide-react'
import { apiRequest } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/useAuth'
import { Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { GlobalSearch } from './GlobalSearch'

interface QueueCounts {
  pendingKyc: number
  flaggedReviews: number
  openSupport: number
  onHoldPayouts: number
  pendingOwnerApproval: number
}

const ENV = import.meta.env.VITE_ENV_NAME ?? 'development'
const ENV_TONE: Record<string, string> = {
  production: 'bg-red-100 text-red-700 border-red-200',
  staging: 'bg-amber-100 text-amber-700 border-amber-200',
  development: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { admin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: queues } = useQuery({
    queryKey: ['queue-counts'],
    queryFn: ({ signal }) => apiRequest<QueueCounts>('/metrics/queues', { signal }),
    refetchInterval: 60_000,
  })

  const totalQueue = queues
    ? queues.pendingKyc + queues.flaggedReviews + queues.openSupport + queues.onHoldPayouts + queues.pendingOwnerApproval
    : 0

  return (
    <header
      className="flex h-14 items-center gap-3 border-b-2 px-4 text-white"
      style={{ backgroundColor: '#04045E', borderBottomColor: 'rgba(185,250,60,0.25)' }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="text-white/70 hover:bg-white/10 hover:text-white"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-3">
        <Badge className={cn('border', ENV_TONE[ENV] ?? ENV_TONE.development)}>{ENV}</Badge>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Queue notifications"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-4 w-4" />
          </Button>
          {totalQueue > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {totalQueue > 99 ? '99+' : totalQueue}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-navy">
              {admin?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-xs font-semibold text-white">{admin?.name}</p>
              <p className="text-[10px] text-white/50">{admin?.roles.join(', ') || 'Admin'}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-card p-1 shadow-lg">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">{admin?.email}</div>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => signOut()}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
