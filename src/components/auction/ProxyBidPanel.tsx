import { Bot } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bidStepFor, formatJPY, nextValidBid } from '@/lib/money'
import { useStore } from '@/store/index'
import { activeProxyOf, currentPrice } from '@/store/selectors'
import type { Auction } from '@/types'

export function ProxyBidPanel({ auction, dealerId }: { auction: Auction; dealerId: string }) {
  const store = useStore()
  const proxy = activeProxyOf(store, auction.id, dealerId)
  const price = currentPrice(store, auction.id)
  const min = nextValidBid(auction, price)
  const step = bidStepFor(price ?? auction.startPrice, auction.stepMode, auction.fixedStep)

  const [max, setMax] = useState<number>(min + step * 10)

  // 密封投標只能投一次，代理出價沒有意義
  if (auction.type === 'SEALED') return null

  if (proxy) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
          <Bot className="size-4" /> 自動出價中
        </h2>
        <p className="mt-2 text-sm text-sky-900">
          已設定代理出價上限 <strong className="tabular-nums">{formatJPY(proxy.maxAmount)}</strong>
        </p>
        <p className="mt-1 text-xs text-sky-800">
          系統只會出「打敗目前最高價所需的最小金額」，不會直接跳到您的上限。
          達到上限被超越時會通知您。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            store.cancelProxyBid({ auctionId: auction.id, dealerId })
            toast.success('已取消自動出價')
          }}
        >
          取消自動出價
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Bot className="size-4" /> 自動出價
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        設定一個您願意出的最高金額。系統會在有人加價時，自動幫您出「打敗對手所需的最小金額」，
        一路加到您的上限為止，不必盯盤。上限金額只有您看得到。
      </p>
      <div className="mt-3">
        <Label htmlFor="proxy-max" className="mb-1.5 block text-sm">
          出價上限
        </Label>
        <Input
          id="proxy-max"
          type="number"
          step={step}
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-slate-500">至少 {formatJPY(min)}</p>
      </div>
      <Button
        className="mt-3 w-full"
        disabled={max < min}
        onClick={() => {
          const r = store.setProxyBid({
            auctionId: auction.id,
            dealerId,
            maxAmount: max,
            now: useClock.getState().virtualNow(),
          })
          if (r.ok) toast.success(`已設定自動出價至 ${formatJPY(max)}`)
          else toast.error(r.error)
        }}
      >
        設定自動出價
      </Button>
    </div>
  )
}
