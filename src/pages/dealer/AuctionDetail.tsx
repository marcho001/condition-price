import { Star } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { BidHistory } from '@/components/auction/BidHistory'
import { BidPanel } from '@/components/auction/BidPanel'
import { Countdown } from '@/components/auction/Countdown'
import { Money } from '@/components/auction/Money'
import { NegotiationPanel } from '@/components/auction/NegotiationPanel'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { PhotoCarousel } from '@/components/vehicle/PhotoCarousel'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import {
  bidCountOf,
  currentPrice,
  dealerCountOf,
  isLeading,
  isWatched,
  myHighestBid,
} from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function AuctionDetail() {
  const { id = '' } = useParams()
  const user = useCurrentUser()!
  const store = useStore()
  const auction = store.auctions.find((a) => a.id === id)
  const vehicle = auction ? store.vehicles.find((v) => v.id === auction.vehicleId) : undefined

  if (!auction || !vehicle) {
    return (
      <p className="text-sm text-slate-500">
        找不到這筆拍賣。
        <Link to="/dealer/auctions" className="underline">
          返回列表
        </Link>
      </p>
    )
  }

  const price = currentPrice(store, auction.id)
  const mine = myHighestBid(store, auction.id, user.id)
  const leading = isLeading(store, auction.id, user.id)
  const watched = isWatched(store, auction.id, user.id)
  const sealed = auction.type === 'SEALED'
  const sealedBeforeClose =
    sealed && (auction.status === '進行中' || auction.status === '未開始')

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
        description={vehicle.orderNo}
        backTo="/dealer/auctions"
        actions={
          <Button
            variant="outline"
            onClick={() => {
              store.toggleWatch({ auctionId: auction.id, dealerId: user.id })
              toast.success(watched ? '已取消關注' : '已加入關注，有新動態會通知您')
            }}
          >
            <Star className={cn('mr-1 size-4', watched && 'fill-amber-400 text-amber-500')} />
            {watched ? '取消關注' : '關注'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <PhotoCarousel seeds={vehicle.photoSeeds} alt={`${vehicle.brand} ${vehicle.model}`} />

          <div>
            <h2 className="mb-2 text-sm font-semibold">車輛規格</h2>
            <SpecTable vehicle={vehicle} showInternal={false} />
          </div>

          {vehicle.remarks && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">車況備註</h2>
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                {vehicle.remarks}
              </p>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">出價紀錄</h2>
            <BidHistory
              auctionId={auction.id}
              hidden={sealedBeforeClose}
              highlightDealerId={user.id}
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={auction.status} />
              <TypeBadge type={auction.type} />
            </div>

            <div className="mt-3">
              {auction.status === '未開始' ? (
                <>
                  <p className="text-xs text-slate-500">開標時間</p>
                  <p className="font-medium tabular-nums">{formatDateTime(auction.startAt)}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    起標價 {formatJPY(auction.startPrice)}。建議先加入關注，開標時會通知您。
                  </p>
                </>
              ) : auction.status === '已成交' && auction.deal ? (
                <>
                  <p className="text-xs text-slate-500">結標金額</p>
                  <Money value={auction.deal.amount} size="lg" className="text-blue-700" />
                  <p className="mt-1 text-sm">
                    {auction.deal.dealerId === user.id ? (
                      <span className="font-medium text-blue-700">您得標</span>
                    ) : (
                      <span className="text-slate-500">已由其他車商得標</span>
                    )}
                  </p>
                </>
              ) : auction.status === '已流標' ? (
                <>
                  <span className="inline-block rounded bg-rose-50 px-2 py-1 text-sm font-medium text-rose-700">
                    流標 · {auction.closeReason}
                  </span>
                  {price !== null && (
                    <p className="mt-2 text-xs text-slate-500">最高出價 {formatJPY(price)}</p>
                  )}
                </>
              ) : sealedBeforeClose ? (
                <>
                  <p className="text-xs text-slate-500">密封投標中</p>
                  <p className="font-medium">共 {dealerCountOf(store, auction.id)} 家投標</p>
                  <p className="mt-1 text-xs text-slate-500">
                    起標價 {formatJPY(auction.startPrice)}。過程中不揭露任何投標金額。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    目前最高價{' '}
                    <span className="tabular-nums">· {bidCountOf(store, auction.id)} 次出價</span>
                  </p>
                  <Money value={price ?? auction.startPrice} size="lg" />
                  {price === null && (
                    <p className="text-xs text-slate-400">（起標價，尚無出價）</p>
                  )}
                  {mine && (
                    <p
                      className={cn(
                        'mt-2 inline-block rounded px-2 py-0.5 text-sm font-medium',
                        leading ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
                      )}
                    >
                      {leading
                        ? '您目前領先'
                        : `您已被超越（您的出價 ${formatJPY(mine.amount)}）`}
                    </p>
                  )}
                </>
              )}
            </div>

            {(auction.status === '進行中' || auction.status === '議價中') && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {auction.status === '進行中' ? (
                  <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
                ) : (
                  auction.negotiation && (
                    <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
                  )
                )}
              </div>
            )}
          </div>

          {auction.status === '進行中' && <BidPanel auction={auction} dealerId={user.id} />}

          {auction.status === '議價中' && (
            <NegotiationPanel auction={auction} dealerId={user.id} />
          )}
        </aside>
      </div>
    </div>
  )
}
