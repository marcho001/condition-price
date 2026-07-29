import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { TYPE_HINT } from '@/components/auction/TypeBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bidStepFor, formatJPY, nextValidBid, validateBidAmount } from '@/lib/money'
import { useStore } from '@/store/index'
import { currentPrice, myHighestBid } from '@/store/selectors'
import type { Auction } from '@/types'

/** 出價超過目前價這個倍數時，強制勾選確認（提案 5.3 異常金額提醒） */
const ABNORMAL_RATIO = 1.5

export function BidPanel({ auction, dealerId }: { auction: Auction; dealerId: string }) {
  const store = useStore()
  const submitBid = useStore((s) => s.submitBid)

  const sealed = auction.type === 'SEALED'
  const price = currentPrice(store, auction.id)
  const mine = myHighestBid(store, auction.id, dealerId)

  // 密封標看不到他人出價，門檻是起標價
  const basePrice = sealed ? null : price
  const min = nextValidBid(auction, basePrice)
  const step = bidStepFor(basePrice ?? auction.startPrice, auction.stepMode, auction.fixedStep)

  const [amount, setAmount] = useState<number>(min)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ackAbnormal, setAckAbnormal] = useState(false)

  const check = useMemo(
    () => validateBidAmount(auction, basePrice, amount),
    [auction, basePrice, amount],
  )
  const abnormal = price !== null && amount > price * ABNORMAL_RATIO

  if (sealed && mine) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">您已投標</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatJPY(mine.amount)}</p>
        <p className="mt-2 text-xs text-slate-500">
          密封投標每家車商僅能投標一次，投出後無法修改或撤回。開標後才會揭露所有投標金額。
        </p>
      </div>
    )
  }

  function openConfirm(value: number) {
    setAmount(value)
    setAckAbnormal(false)
    setConfirmOpen(true)
  }

  function confirm() {
    const r = submitBid({
      auctionId: auction.id,
      dealerId,
      amount,
      now: useClock.getState().virtualNow(),
    })
    if (!r.ok) {
      toast.error(r.error)
      return
    }
    toast.success(`已出價 ${formatJPY(amount)}`)
    setConfirmOpen(false)
    setAmount(nextValidBid(auction, currentPrice(useStore.getState(), auction.id)))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{sealed ? '投標' : '出價'}</h2>

      {!sealed && (
        <Button className="mt-3 w-full" onClick={() => openConfirm(min)}>
          + 一級距（{formatJPY(min)}）
        </Button>
      )}

      <div className="mt-3">
        <Label htmlFor="bid-amount" className="mb-1.5 block text-sm">
          {sealed ? '投標金額' : '自訂金額'}
        </Label>
        <Input
          id="bid-amount"
          type="number"
          step={step}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <p className={check.ok ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-xs text-rose-600'}>
          {check.ok ? `至少 ${formatJPY(min)}，以 ${formatJPY(step)} 為級距` : check.reason}
        </p>
      </div>

      <Button
        variant={sealed ? 'default' : 'outline'}
        className="mt-3 w-full"
        onClick={() => openConfirm(amount)}
        disabled={!check.ok}
      >
        {sealed ? '送出密封投標' : '以此金額出價'}
      </Button>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">{TYPE_HINT[auction.type]}</p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認{sealed ? '投標' : '出價'}</DialogTitle>
            <DialogDescription>
              {sealed
                ? '密封投標送出後無法修改或撤回，請確認金額。'
                : '出價具約束力，送出後原則上不可撤回。'}
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            <div className="flex justify-between px-4 py-2">
              <dt className="text-slate-500">您的{sealed ? '投標' : '出價'}金額</dt>
              <dd className="font-semibold tabular-nums">{formatJPY(amount)}</dd>
            </div>
            {!sealed && (
              <div className="flex justify-between px-4 py-2">
                <dt className="text-slate-500">目前最高價</dt>
                <dd className="tabular-nums">{price === null ? '尚無出價' : formatJPY(price)}</dd>
              </div>
            )}
            {!sealed && price !== null && (
              <div className="flex justify-between px-4 py-2">
                <dt className="text-slate-500">高出目前價</dt>
                <dd className="tabular-nums">{formatJPY(amount - price)}</dd>
              </div>
            )}
          </dl>

          {abnormal && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <Checkbox
                checked={ackAbnormal}
                onCheckedChange={(v) => setAckAbnormal(v === true)}
                className="mt-0.5"
              />
              <span className="text-amber-900">
                此金額超出目前最高價 {Math.round((amount / price - 1) * 100)}%，明顯偏高。
                我確認金額無誤。
              </span>
            </label>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              返回修改
            </Button>
            <Button onClick={confirm} disabled={abnormal && !ackAbnormal}>
              確認送出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
