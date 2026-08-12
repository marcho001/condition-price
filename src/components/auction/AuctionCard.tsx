import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Countdown } from '@/components/auction/Countdown'
import { Money } from '@/components/auction/Money'
import { ReserveHint } from '@/components/auction/ReserveHint'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { Card } from '@/components/ui/card'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import { bidCountOf, currentPrice, dealerCountOf, isLeading, isWatched, myHighestBid } from '@/store/selectors'
import type { Auction, Vehicle } from '@/types'

/** 公司人員也不一定看得到底價——車輛登錄員與系統管理員就看不到（Phase 1 §1.1） */
export type CardViewer =
  | { kind: 'staff'; canSeeReserve: boolean }
  | { kind: 'dealer'; dealerId: string }

export function AuctionCard({
  auction,
  vehicle,
  viewer,
  to,
  footer,
}: {
  auction: Auction
  vehicle: Vehicle
  viewer: CardViewer
  to: string
  footer?: ReactNode
}) {
  const store = useStore()
  const price = currentPrice(store, auction.id)
  const bids = bidCountOf(store, auction.id)
  const sealedBefore =
    auction.type === 'SEALED' && (auction.status === '進行中' || auction.status === '未開始')

  const dealerId = viewer.kind === 'dealer' ? viewer.dealerId : null
  const leading = dealerId ? isLeading(store, auction.id, dealerId) : false
  const mine = dealerId ? myHighestBid(store, auction.id, dealerId) : null
  const watched = dealerId ? isWatched(store, auction.id, dealerId) : false

  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0 transition hover:shadow-md">
      <Link to={to} className="relative block" aria-label={`${vehicle.brand} ${vehicle.model} 詳細`}>
        <VehiclePhoto
          seed={vehicle.photoSeeds[0]}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="aspect-[4/3]"
        />
        <span className="absolute left-2 top-2">
          <StatusBadge status={auction.status} className="shadow-sm" />
        </span>
        {watched && (
          <Star
            aria-label="已關注"
            className="absolute right-2 top-2 size-5 fill-amber-400 text-amber-500 drop-shadow"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={to} className="min-w-0">
          <p className="font-medium leading-tight hover:underline">
            {vehicle.brand} {vehicle.model}
            <span className="ml-1.5 text-sm tabular-nums text-slate-500">{vehicle.year}</span>
          </p>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />
          <span className="tabular-nums">{vehicle.mileage.toLocaleString('en-US')} km</span>
          <TypeBadge type={auction.type} />
        </div>

        <p className="font-mono text-xs text-slate-400">{vehicle.orderNo}</p>

        <div className="mt-1 border-t border-slate-100 pt-2">
          {auction.status === '已成交' && auction.deal ? (
            <div>
              <p className="text-xs text-slate-500">結標金額</p>
              <Money value={auction.deal.amount} size="lg" className="text-blue-700" />
            </div>
          ) : auction.status === '已流標' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                流標 · {auction.closeReason}
              </span>
              {price !== null && (
                <span className="text-xs tabular-nums text-slate-500">
                  最高 {price.toLocaleString('en-US')}
                </span>
              )}
            </div>
          ) : sealedBefore ? (
            <div>
              <p className="text-xs text-slate-500">密封投標中</p>
              <p className="text-sm font-medium">
                {viewer.kind === 'staff'
                  ? `共 ${dealerCountOf(store, auction.id)} 家投標`
                  : mine
                    ? `您已投標 ${mine.amount.toLocaleString('en-US')}`
                    : '尚未投標'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500">
                目前最高價 <span className="tabular-nums">· {bids} 次出價</span>
              </p>
              <Money value={price ?? auction.startPrice} size="lg" />
              {price === null && (
                <span className="ml-1 text-xs text-slate-400">（起標價，尚無出價）</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {auction.status === '未開始' ? (
            <span className="text-slate-500">開標 {formatDateTime(auction.startAt)}</span>
          ) : auction.status === '進行中' ? (
            <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
          ) : auction.status === '議價中' && auction.negotiation ? (
            <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
          ) : null}

          {viewer.kind === 'staff' && viewer.canSeeReserve && (
            <ReserveHint reservePrice={auction.reservePrice} currentPrice={price} />
          )}

          {viewer.kind === 'dealer' && auction.status === '進行中' && mine && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-medium',
                leading ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
              )}
            >
              {leading ? '您目前領先' : '您已被超越'}
            </span>
          )}

          {viewer.kind === 'dealer' &&
            auction.status === '已成交' &&
            auction.deal?.dealerId === dealerId && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800">
                您得標
              </span>
            )}
        </div>

        {footer && <div className="mt-auto flex gap-2 pt-2">{footer}</div>}
      </div>
    </Card>
  )
}
