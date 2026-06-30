import { cn } from '../lib/cn'

/** Page header with title, optional description, and right-aligned primary actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A labelled key/value row for detail panels. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  )
}

export function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-border">{children}</dl>
}
