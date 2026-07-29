import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { SPEEDS, useClock } from '@/clock/clockStore'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'

const MIN = 60_000
const SKIPS: Array<[string, number]> = [
  ['+1 分', MIN],
  ['+10 分', 10 * MIN],
  ['+1 小時', 60 * MIN],
  ['+1 天', 1_440 * MIN],
]

const SPEED_LABEL: Record<number, string> = { 0: '暫停', 1: '1x', 10: '10x', 60: '60x' }

/** 快轉後立刻推進引擎，讓使用者馬上看到結果而不必等下一個 tick */
export function skipAndAdvance(ms: number): number {
  const before = useStore.getState().notifications.length
  useClock.getState().skip(ms)
  useStore.getState().advance(useClock.getState().virtualNow())
  return useStore.getState().notifications.length - before
}

export function TimeControls() {
  const clock = useClock()
  const now = useVirtualNow(1000)

  function skip(ms: number, label: string) {
    const fired = skipAndAdvance(ms)
    toast.success(`已快轉 ${label.replace('+', '')}`, {
      description: fired > 0 ? `觸發 ${fired} 則通知` : '沒有事件被觸發',
    })
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">時間</h3>
      <p className="mb-2 font-mono text-sm tabular-nums">{formatDateTime(now)}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {SKIPS.map(([label, ms]) => (
          <Button key={label} variant="outline" size="sm" onClick={() => skip(ms, label)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={clock.speed === s}
            onClick={() => clock.setSpeed(s)}
            className={cn(
              'flex-1 rounded border px-2 py-1 text-xs transition',
              clock.speed === s
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white hover:border-slate-400',
            )}
          >
            {SPEED_LABEL[s]}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-1.5 w-full justify-start text-xs text-slate-500"
        onClick={() => {
          clock.resetToReal()
          toast.success('已回到真實時間')
        }}
      >
        <RotateCcw className="mr-1 size-3" /> 回到真實時間
      </Button>
    </section>
  )
}
