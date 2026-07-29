import { Lock } from 'lucide-react'
import { formatJPY } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * 底價相關資訊。一律帶鎖頭與「內部」底色，
 * 避免示範時被誤解為車商看得到的資訊。
 * 這個元件只能出現在 /admin 頁面。
 */
export function ReserveHint({
  reservePrice,
  currentPrice,
  className,
}: {
  reservePrice: number
  currentPrice: number | null
  className?: string
}) {
  const reached = (currentPrice ?? 0) >= reservePrice
  const gap = reservePrice - (currentPrice ?? 0)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-xs',
        className,
      )}
    >
      <Lock className="size-3 text-slate-400" />
      <span className="text-slate-500">內部</span>
      {reached ? (
        <span className="font-medium text-emerald-700">已達底價</span>
      ) : (
        <span className="font-medium tabular-nums text-amber-700">尚差 {formatJPY(gap)}</span>
      )}
    </span>
  )
}
