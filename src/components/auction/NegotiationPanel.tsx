import { Handshake } from 'lucide-react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Countdown } from '@/components/auction/Countdown'
import { Button } from '@/components/ui/button'
import { formatJPY } from '@/lib/money'
import { useStore } from '@/store/index'
import { myHighestBid } from '@/store/selectors'
import type { Auction } from '@/types'

export function NegotiationPanel({
  auction,
  dealerId,
}: {
  auction: Auction
  dealerId: string
}) {
  const store = useStore()
  const nego = auction.negotiation
  if (!nego) return null

  const mine = myHighestBid(store, auction.id, dealerId)

  // 不是被邀請的人：只告知拍賣正在議價，不揭露對象與金額
  if (nego.dealerId !== dealerId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        這筆拍賣未達底價，目前正在與最高出價者議價中。
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Handshake className="size-4" /> 議價邀請
      </h2>
      <p className="mt-2 text-sm text-amber-900">
        您的出價 <strong className="tabular-nums">{formatJPY(mine?.amount ?? 0)}</strong> 未達底價。
        加價至 <strong className="tabular-nums">{formatJPY(nego.amount)}</strong> 即可成交。
      </p>
      <p className="mt-1 text-xs text-amber-800">
        <Countdown to={nego.deadline} prefix="剩餘決定時間" />
        　逾期未決定將依序詢問下一位出價者。
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          onClick={() => {
            const r = store.acceptNegotiationAs({
              auctionId: auction.id,
              dealerId,
              now: useClock.getState().virtualNow(),
            })
            if (r.ok) toast.success(`已以 ${formatJPY(nego.amount)} 成交`)
            else toast.error(r.error)
          }}
        >
          加價至 {formatJPY(nego.amount)} 成交
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const r = store.declineNegotiationAs({
              auctionId: auction.id,
              dealerId,
              now: useClock.getState().virtualNow(),
            })
            if (r.ok) toast.success('已放棄這次議價')
            else toast.error(r.error)
          }}
        >
          放棄
        </Button>
      </div>
    </div>
  )
}
