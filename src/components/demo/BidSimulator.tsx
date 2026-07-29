import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ALL_DEALER_IDS, dealerLabel } from '@/data/users'
import { formatJPY, nextValidBid } from '@/lib/money'
import { useStore } from '@/store/index'
import { currentPrice } from '@/store/selectors'
import { highestBid } from '@/engine/rules'

const AUTO_INTERVAL_MS = 3_000

export function BidSimulator() {
  const store = useStore()
  const { id: routeAuctionId } = useParams()

  const biddable = store.auctions.filter((a) => a.status === '進行中')
  const [auctionId, setAuctionId] = useState('')
  const [dealerId, setDealerId] = useState(ALL_DEALER_IDS[0])
  const [amount, setAmount] = useState<string>('')
  const [auto, setAuto] = useState(false)
  const timer = useRef<number | null>(null)

  // 預設選當前頁面那筆拍賣
  const effectiveId =
    auctionId ||
    (routeAuctionId && biddable.some((a) => a.id === routeAuctionId)
      ? routeAuctionId
      : biddable[0]?.id) ||
    ''

  const auction = store.auctions.find((a) => a.id === effectiveId)
  const price = auction ? currentPrice(store, auction.id) : null
  const min = auction ? nextValidBid(auction, auction.type === 'SEALED' ? null : price) : 0

  function bidOnce(dealer: string, value: number) {
    if (!auction) return
    const r = store.submitBid({
      auctionId: auction.id,
      dealerId: dealer,
      amount: value,
      now: useClock.getState().virtualNow(),
    })
    if (!r.ok) toast.error(`${dealerLabel(dealer)}：${r.error}`)
  }

  // 連續隨機出價
  useEffect(() => {
    if (!auto) {
      if (timer.current !== null) window.clearInterval(timer.current)
      timer.current = null
      return
    }
    timer.current = window.setInterval(() => {
      const s = useStore.getState()
      const a = s.auctions.find((x) => x.id === effectiveId)
      if (!a || a.status !== '進行中') {
        setAuto(false)
        return
      }
      const leader = highestBid(s.bids.filter((b) => b.auctionId === a.id))?.dealerId ?? null
      const pool = ALL_DEALER_IDS.filter((d) => d !== leader)
      const dealer = pool[Math.floor(Math.random() * pool.length)]
      const next = nextValidBid(a, a.type === 'SEALED' ? null : currentPrice(s, a.id))
      s.submitBid({
        auctionId: a.id,
        dealerId: dealer,
        amount: next,
        now: useClock.getState().virtualNow(),
      })
    }, AUTO_INTERVAL_MS)
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [auto, effectiveId])

  if (biddable.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          模擬出價
        </h3>
        <p className="text-xs text-slate-500">目前沒有進行中的拍賣。</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        模擬出價
      </h3>

      <Label htmlFor="sim-auction" className="sr-only">
        選擇拍賣
      </Label>
      <select
        id="sim-auction"
        value={effectiveId}
        onChange={(e) => setAuctionId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {biddable.map((a) => {
          const v = store.vehicles.find((x) => x.id === a.vehicleId)
          return (
            <option key={a.id} value={a.id}>
              {v ? `${v.brand} ${v.model} ${v.year}` : a.id}
              {a.id === routeAuctionId ? '（當前頁面）' : ''}
            </option>
          )
        })}
      </select>

      <Label htmlFor="sim-dealer" className="sr-only">
        選擇車商
      </Label>
      <select
        id="sim-dealer"
        value={dealerId}
        onChange={(e) => setDealerId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {ALL_DEALER_IDS.map((d) => (
          <option key={d} value={d}>
            {dealerLabel(d)}
          </option>
        ))}
      </select>

      <p className="mb-1.5 text-xs text-slate-500">
        {auction?.type === 'SEALED'
          ? `密封投標 · 起標價 ${formatJPY(auction.startPrice)}`
          : `目前 ${price === null ? '尚無出價' : formatJPY(price)} · 下一級距 ${formatJPY(min)}`}
      </p>

      <div className="flex gap-1.5">
        <Button size="sm" className="flex-1" onClick={() => bidOnce(dealerId, min)}>
          加一級距
        </Button>
        <Label htmlFor="sim-amount" className="sr-only">
          自訂金額
        </Label>
        <Input
          id="sim-amount"
          type="number"
          placeholder="自訂"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-24 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={amount === ''}
          onClick={() => bidOnce(dealerId, Number(amount))}
        >
          送出
        </Button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        連續隨機出價（每 3 秒一次）
      </label>
    </section>
  )
}
