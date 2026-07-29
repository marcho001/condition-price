import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

type Force = 'start' | 'close' | 'pass' | 'negotiate'

const ACTIONS: Array<{ label: string; to: Force }> = [
  { label: '立即開標', to: 'start' },
  { label: '立即結標', to: 'close' },
  { label: '強制流標', to: 'pass' },
  { label: '強制議價', to: 'negotiate' },
]

export function ForceStateControls() {
  const store = useStore()
  const user = useCurrentUser()
  const { id: routeAuctionId } = useParams()

  const targets = store.auctions.filter(
    (a) => a.status === '未開始' || a.status === '進行中' || a.status === '議價中',
  )
  const [auctionId, setAuctionId] = useState('')
  const effectiveId =
    auctionId ||
    (routeAuctionId && targets.some((a) => a.id === routeAuctionId)
      ? routeAuctionId
      : targets[0]?.id) ||
    ''

  function run(to: Force, label: string) {
    const r = store.forceStatus({
      auctionId: effectiveId,
      to,
      now: useClock.getState().virtualNow(),
    })
    if (r.ok) toast.success(`${label}完成`)
    else toast.error(r.error)
  }

  if (targets.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          強制狀態
        </h3>
        <p className="text-xs text-slate-500">沒有可操作的拍賣。</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        強制狀態
      </h3>

      <Label htmlFor="force-auction" className="sr-only">
        選擇要操作的拍賣
      </Label>
      <select
        id="force-auction"
        value={effectiveId}
        onChange={(e) => setAuctionId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {targets.map((a) => {
          const v = store.vehicles.find((x) => x.id === a.vehicleId)
          return (
            <option key={a.id} value={a.id}>
              [{a.status}] {v ? `${v.brand} ${v.model}` : a.id}
            </option>
          )
        })}
      </select>

      <div className="grid grid-cols-2 gap-1.5">
        {ACTIONS.map(({ label, to }) => (
          <Button key={to} variant="outline" size="sm" onClick={() => run(to, label)}>
            {label}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-1.5 w-full text-rose-700 hover:bg-rose-50"
        onClick={() => {
          const r = store.withdraw({
            auctionId: effectiveId,
            reason: 'Demo 控制台觸發',
            byUserId: user?.id ?? 'u-staff',
          })
          if (r.ok) toast.success('已撤標')
          else toast.error(r.error)
        }}
      >
        強制撤標
      </Button>
    </section>
  )
}
