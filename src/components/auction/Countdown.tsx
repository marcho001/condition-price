import { useVirtualNow } from '@/clock/useVirtualNow'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/time'

const URGENT_MS = 300_000

/**
 * 倒數計時。刻意用自己的 1 秒 interval 而非讀 store，
 * 每秒重繪只影響這個元件，不會觸發 store 寫入或整頁重繪。
 */
export function Countdown({
  to,
  extendedMs = 0,
  prefix,
  className,
}: {
  to: number
  extendedMs?: number
  prefix?: string
  className?: string
}) {
  const now = useVirtualNow(1000)
  const remaining = to - now
  const urgent = remaining > 0 && remaining <= URGENT_MS

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      {prefix && <span className="text-xs text-slate-500">{prefix}</span>}
      <span
        className={cn(
          'font-medium tabular-nums',
          urgent && 'animate-pulse text-rose-600',
          remaining <= 0 && 'text-slate-400',
        )}
      >
        {remaining <= 0 ? '已結束' : formatDuration(remaining)}
      </span>
      {extendedMs > 0 && (
        <span
          title={`原定結標時間已往後延 ${Math.round(extendedMs / 60_000)} 分鐘`}
          className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
        >
          已延長 {Math.round(extendedMs / 60_000)} 分
        </span>
      )}
    </span>
  )
}
