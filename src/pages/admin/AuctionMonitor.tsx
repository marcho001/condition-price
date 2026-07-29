import { Ban, Handshake, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { BidHistory } from '@/components/auction/BidHistory'
import { Countdown } from '@/components/auction/Countdown'
import { StatRow } from '@/components/auction/StatRow'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { dealerLabel } from '@/data/users'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { bidCountOf, currentPrice, dealerCountOf } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function AuctionMonitor() {
  const { id = '' } = useParams()
  const user = useCurrentUser()
  const store = useStore()
  const auction = store.auctions.find((a) => a.id === id)
  const vehicle = auction ? store.vehicles.find((v) => v.id === auction.vehicleId) : undefined

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [newReserve, setNewReserve] = useState(0)

  if (!auction || !vehicle) {
    return (
      <p className="text-sm text-slate-500">
        找不到這筆拍賣。
        <Link to="/admin/auctions" className="underline">
          返回列表
        </Link>
      </p>
    )
  }

  const price = currentPrice(store, auction.id)
  const now = () => useClock.getState().virtualNow()
  const sealedBeforeClose =
    auction.type === 'SEALED' && (auction.status === '進行中' || auction.status === '未開始')
  const canWithdraw = auction.status === '未開始' || auction.status === '進行中'

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
        description={vehicle.orderNo}
        backTo="/admin/auctions"
        actions={
          <>
            {auction.status === '未開始' && (
              <Button variant="outline" render={<Link to={`/admin/auctions/${auction.id}/edit`} />}>
                編輯設定
              </Button>
            )}
            {canWithdraw && (
              <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                <Ban className="mr-1 size-4" /> 撤標
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={auction.status} />
        <TypeBadge type={auction.type} />
        {auction.status === '進行中' && (
          <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
        )}
        {auction.status === '議價中' && auction.negotiation && (
          <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
        )}
      </div>

      <StatRow
        items={[
          {
            label: sealedBeforeClose ? '投標家數' : '目前最高價',
            value: sealedBeforeClose
              ? `${dealerCountOf(store, auction.id)} 家`
              : formatJPY(price ?? auction.startPrice),
            hint:
              price === null && !sealedBeforeClose ? '尚無出價（顯示起標價）' : undefined,
          },
          { label: '出價筆數', value: bidCountOf(store, auction.id) },
          { label: '參與車商數', value: dealerCountOf(store, auction.id) },
          {
            label: '底價',
            value: (
              <span className="flex items-center gap-1">
                <Lock className="size-3 text-slate-400" />
                {formatJPY(auction.reservePrice)}
              </span>
            ),
            hint:
              price !== null && price >= auction.reservePrice
                ? '已達底價'
                : `尚差 ${formatJPY(auction.reservePrice - (price ?? 0))}`,
          },
          {
            label: '已延長',
            value:
              auction.extendedMs > 0 ? `${Math.round(auction.extendedMs / 60_000)} 分鐘` : '—',
            hint:
              auction.extendedMs > 0 ? `原定 ${formatDateTime(auction.originalEndAt)}` : undefined,
          },
        ]}
      />

      {auction.status === '議價中' && auction.negotiation && (
        <Card className="mt-4 border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Handshake className="size-4" /> 議價處理
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            最高出價 <strong className="tabular-nums">{formatJPY(price ?? 0)}</strong> 未達底價{' '}
            <strong className="tabular-nums">{formatJPY(auction.reservePrice)}</strong>。已邀請{' '}
            <strong>{dealerLabel(auction.negotiation.dealerId)}</strong> 加價至{' '}
            <strong className="tabular-nums">{formatJPY(auction.negotiation.amount)}</strong> 成交。
          </p>
          {auction.negotiation.declinedDealerIds.length > 0 && (
            <p className="mt-1 text-xs text-amber-800">
              已放棄：{auction.negotiation.declinedDealerIds.map(dealerLabel).join('、')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                const r = store.acceptHighest({ auctionId: auction.id, now: now() })
                if (r.ok) toast.success(`已接受最高價 ${formatJPY(price ?? 0)}，拍賣成交`)
                else toast.error(r.error)
              }}
            >
              接受目前最高價 {formatJPY(price ?? 0)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewReserve(auction.reservePrice)
                setReserveOpen(true)
              }}
            >
              調整底價
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const r = store.declineNegotiationAs({
                  auctionId: auction.id,
                  dealerId: auction.negotiation!.dealerId,
                  now: now(),
                })
                if (r.ok) toast.success('已放棄本次議價')
                else toast.error(r.error)
              }}
            >
              放棄議價
            </Button>
          </div>
        </Card>
      )}

      {auction.status === '已撤標' && (
        <Card className="mt-4 border-slate-300 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold">撤標紀錄</h2>
          <p className="mt-2 text-sm">理由：{auction.withdrawReason}</p>
          <p className="mt-1 text-xs text-slate-500">
            操作人：{auction.withdrawnBy ? dealerLabel(auction.withdrawnBy) : '—'}
            　（車商端只會看到「已下架」，不會看到理由）
          </p>
        </Card>
      )}

      {auction.status === '已成交' && auction.deal && (
        <Card className="mt-4 border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">成交</h2>
          <p className="mt-2 text-sm text-blue-900">
            {dealerLabel(auction.deal.dealerId)} 以{' '}
            <strong className="tabular-nums">{formatJPY(auction.deal.amount)}</strong> 得標，成交時間{' '}
            {formatDateTime(auction.deal.at)}。
          </p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <h2 className="mb-2 text-sm font-semibold">出價紀錄</h2>
          <p className="mb-2 text-xs text-slate-500">
            出價者以匿名代號顯示。代理出價只標記來源，不顯示車商設定的上限金額。
          </p>
          <BidHistory auctionId={auction.id} hidden={sealedBeforeClose} />
        </div>

        <div>
          <VehiclePhoto
            seed={vehicle.photoSeeds[0]}
            alt={vehicle.model}
            className="mb-3 aspect-[4/3] rounded-lg"
          />
          <SpecTable vehicle={vehicle} showInternal={user?.canSeeReserve ?? false} />
        </div>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤標</DialogTitle>
            <DialogDescription>
              撤標後車輛轉為「已下架」，所有出價者與關注者都會收到通知。
              理由僅供內部留存，不會顯示給車商。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="withdraw-reason" className="mb-1.5 block text-sm">
              撤標理由（至少 5 個字）
            </Label>
            <Textarea
              id="withdraw-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：借款人已清償欠款，車輛不再處分"
            />
            <p className="mt-1 text-xs text-slate-500">{reason.trim().length} / 5</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5}
              onClick={() => {
                const r = store.withdraw({
                  auctionId: auction.id,
                  reason,
                  byUserId: user!.id,
                })
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                toast.success('已撤標，相關車商已收到通知')
                setWithdrawOpen(false)
                setReason('')
              }}
            >
              確認撤標
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整底價</DialogTitle>
            <DialogDescription>
              底價只能調降。若調降後最高出價已達新底價，拍賣會立刻以該最高出價成交
              （不是以新底價成交）。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="new-reserve" className="mb-1.5 block text-sm">
              新底價
            </Label>
            <Input
              id="new-reserve"
              type="number"
              step={10_000}
              value={newReserve}
              onChange={(e) => setNewReserve(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              目前底價 {formatJPY(auction.reservePrice)}，最高出價 {formatJPY(price ?? 0)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const r = store.adjustReservePrice({
                  auctionId: auction.id,
                  reservePrice: newReserve,
                  now: now(),
                })
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                toast.success('底價已調整')
                setReserveOpen(false)
              }}
            >
              確認調整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
