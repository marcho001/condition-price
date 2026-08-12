import { cn } from '@/lib/utils'
import type { AuctionStatus } from '@/types'

const TONE: Record<AuctionStatus, string> = {
  未開始: 'bg-slate-100 text-slate-700 border-slate-200',
  進行中: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  議價中: 'bg-amber-100 text-amber-800 border-amber-200',
  已流標: 'bg-rose-100 text-rose-800 border-rose-200',
  已成交: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function StatusBadge({ status, className }: { status: AuctionStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        TONE[status],
        className,
      )}
    >
      {status}
    </span>
  )
}
