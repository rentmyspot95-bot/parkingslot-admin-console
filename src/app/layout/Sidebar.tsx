import { NavLink } from 'react-router-dom'
import { NAV } from '../nav'
import { useSessionStore } from '@/shared/auth/session'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { cn } from '@/shared/lib/cn'
import { Logo } from '@/shared/ui'

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const permissionSet = useSessionStore((s) => s.permissionSet)

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Logo variant="mark" className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold text-navy">ParkingSlot</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admin Console</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {NAV.map((group, gi) => {
          const items = group.items.filter(
            (it) => it.anyOf.length === 0 || hasAnyPermission(permissionSet, it.anyOf),
          )
          if (items.length === 0) return null
          return (
            <div key={gi} className="mb-1 px-2">
              {!collapsed && group.label && (
                <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              {items.map((it) => {
                const Icon = it.icon
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/'}
                    title={collapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
