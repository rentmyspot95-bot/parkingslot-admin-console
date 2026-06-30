import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { apiRequest } from '@/shared/api/client'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface SearchResult {
  type: 'user' | 'host' | 'listing' | 'booking' | 'payment'
  id: string
  label: string
  sublabel?: string
}

const TYPE_ROUTES: Record<SearchResult['type'], string> = {
  user: '/users',
  host: '/hosts',
  listing: '/listings',
  booking: '/bookings',
  payment: '/payments',
}

/** Top-bar global search: jump to user / host / listing / booking / payment by id, phone, or email. */
export function GlobalSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // "/" focuses the global search (design doc §11).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', q],
    queryFn: ({ signal }) => apiRequest<SearchResult[]>('/search', { query: { q }, signal }),
    enabled: q.trim().length >= 2,
  })

  function go(r: SearchResult) {
    navigate(`${TYPE_ROUTES[r.type]}/${r.id}`)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search users, hosts, listings, bookings…  ( / )"
        className="h-9 w-full rounded-md border border-white/15 bg-white/10 pl-8 pr-3 text-sm text-white placeholder:text-white/50 focus-visible:border-accent/40 focus-visible:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" /> Searching…
            </div>
          )}
          {!isFetching && data && data.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matches for “{q}”.</p>
          )}
          {!isFetching &&
            data?.map((r) => (
              <button
                key={`${r.type}:${r.id}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.label}</span>
                  {r.sublabel && <span className="block truncate text-xs text-muted-foreground">{r.sublabel}</span>}
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {r.type}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
