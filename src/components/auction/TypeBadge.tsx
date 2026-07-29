import { TYPE_HINT, TYPE_LABEL } from '@/lib/auctionMeta'
import { cn } from '@/lib/utils'
import type { AuctionType } from '@/types'

export function TypeBadge({ type, className }: { type: AuctionType; className?: string }) {
  return (
    <span
      title={TYPE_HINT[type]}
      className={cn(
        'inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700',
        className,
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}
