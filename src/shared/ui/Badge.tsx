import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      // Exact app badge palette (--success/amber/danger/primary tints).
      tone: {
        neutral: 'bg-slate-100 text-slate-600 border-slate-200',
        green: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
        amber: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        red: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
        blue: 'bg-[#E8F0FF] text-[#0055FF] border-[#B3D1FF]',
        lime: 'bg-[#F0FDCE] text-[#5C7A0F] border-[#D9F99D]',
        grey: 'bg-slate-100 text-slate-600 border-slate-200',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
