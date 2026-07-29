import { ChevronsDownUp, Move, Settings2, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { BidSimulator } from '@/components/demo/BidSimulator'
import { ForceStateControls } from '@/components/demo/ForceStateControls'
import { NotificationPusher } from '@/components/demo/NotificationPusher'
import { ScenarioPicker } from '@/components/demo/ScenarioPicker'
import { TimeControls, skipAndAdvance } from '@/components/demo/TimeControls'
import {
  CORNER_CLASS,
  CORNER_LABEL,
  useConsoleState,
  type Corner,
} from '@/components/demo/useConsoleState'
import { LOGINABLE_USERS } from '@/data/users'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

const CORNERS: Corner[] = ['br', 'bl', 'tr', 'tl']

/**
 * Demo 控制台。
 *
 * 三段收合都是 position: fixed 的 overlay，刻意不用 push 式 drawer
 * —— 頁面 layout 寬度不會因為控制台開合而改變。
 * 點面板外也不會自動關閉，因為要能邊操作邊看頁面反應。
 */
export function DemoConsole() {
  const user = useCurrentUser()
  const { mode, setMode, corner, setCorner } = useConsoleState()
  const clock = useClock()
  const now = useVirtualNow(1000)
  const login = useStore((s) => s.login)
  const navigate = useNavigate()

  // 登入頁不需要控制台
  if (!user) return null

  if (mode === 'hidden') {
    return (
      <button
        type="button"
        onClick={() => setMode('full')}
        aria-label="開啟 Demo 控制台"
        title="開啟 Demo 控制台（快捷鍵 `）"
        className={cn(
          'fixed z-50 grid size-12 place-items-center rounded-full bg-slate-900/40 text-white shadow-lg transition hover:bg-slate-900',
          CORNER_CLASS[corner],
        )}
      >
        <Settings2 className="size-5" />
      </button>
    )
  }

  if (mode === 'mini') {
    return (
      <div
        aria-label="Demo 控制台（精簡）"
        className={cn(
          'fixed z-50 flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 shadow-lg backdrop-blur',
          CORNER_CLASS[corner],
        )}
      >
        <Settings2 className="size-4 text-slate-400" />
        <span className="font-mono text-xs tabular-nums">{formatDateTime(now)}</span>
        <button
          type="button"
          onClick={() => {
            const fired = skipAndAdvance(600_000)
            toast.success('已快轉 10 分鐘', {
              description: fired > 0 ? `觸發 ${fired} 則通知` : '沒有事件被觸發',
            })
          }}
          className="rounded border border-slate-200 px-1.5 py-0.5 text-xs hover:border-slate-400"
        >
          +10m
        </button>
        <button
          type="button"
          aria-label="切換加速"
          onClick={() => clock.setSpeed(clock.speed === 1 ? 10 : 1)}
          className={cn(
            'rounded border px-1.5 py-0.5 text-xs',
            clock.speed > 1
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-200',
          )}
        >
          {clock.speed > 1 ? `x${clock.speed}` : '⏩'}
        </button>
        <button
          type="button"
          onClick={() => setMode('full')}
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          展開
        </button>
        <button type="button" onClick={() => setMode('hidden')} aria-label="收起控制台">
          <X className="size-3.5 text-slate-400 hover:text-slate-900" />
        </button>
      </div>
    )
  }

  return (
    <div
      aria-label="Demo 控制台"
      className={cn(
        'fixed z-50 flex max-h-[80vh] w-90 flex-col rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur',
        CORNER_CLASS[corner],
      )}
      style={{ width: '22.5rem' }}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <Settings2 className="size-4 text-slate-400" />
        <span className="text-sm font-semibold">Demo 控制台</span>
        <span className="ml-auto flex items-center gap-1">
          <Move aria-label="移動位置" className="size-3 text-slate-300" />
          {CORNERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCorner(c)}
              aria-label={`移到${CORNER_LABEL[c]}`}
              aria-pressed={corner === c}
              className={cn(
                'size-4 rounded border text-[9px] leading-none',
                corner === c
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-400',
              )}
            >
              {CORNER_LABEL[c][0]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMode('mini')}
            aria-label="縮小控制台"
            className="ml-1"
          >
            <ChevronsDownUp className="size-3.5 text-slate-400 hover:text-slate-900" />
          </button>
          <button type="button" onClick={() => setMode('hidden')} aria-label="收起控制台">
            <X className="size-3.5 text-slate-400 hover:text-slate-900" />
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <TimeControls />
        <hr className="border-slate-100" />
        <BidSimulator />
        <hr className="border-slate-100" />
        <ForceStateControls />
        <hr className="border-slate-100" />
        <NotificationPusher />
        <hr className="border-slate-100" />

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            場景
          </h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {LOGINABLE_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={u.id === user.id}
                onClick={() => {
                  login(u.id)
                  navigate(u.role === 'staff' ? '/admin/garage' : '/dealer/auctions')
                  toast.success(`已切換為 ${u.company ?? u.name}`)
                }}
                className={cn(
                  'rounded border px-2 py-1 text-xs transition',
                  u.id === user.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 hover:border-slate-400',
                )}
              >
                {u.company ?? u.name}
              </button>
            ))}
          </div>
          <ScenarioPicker />
        </section>
      </div>

      <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
        快捷鍵：<kbd className="font-mono">`</kbd> 開合 · <kbd className="font-mono">Esc</kbd> 收起
      </p>
    </div>
  )
}
