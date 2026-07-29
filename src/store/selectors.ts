import { highestBid } from '@/engine/rules'
import type {
  AppNotification,
  Auction,
  AuctionStatus,
  AuctionType,
  Bid,
  EngineData,
  ProxyBid,
  Vehicle,
  VehicleStatus,
} from '@/types'

export function bidsOf(data: Pick<EngineData, 'bids'>, auctionId: string): Bid[] {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function currentPrice(data: Pick<EngineData, 'bids'>, auctionId: string): number | null {
  return highestBid(bidsOf(data, auctionId))?.amount ?? null
}

export function bidCountOf(data: Pick<EngineData, 'bids'>, auctionId: string): number {
  return bidsOf(data, auctionId).length
}

export function dealerCountOf(data: Pick<EngineData, 'bids'>, auctionId: string): number {
  return new Set(bidsOf(data, auctionId).map((b) => b.dealerId)).size
}

/**
 * 依「該拍賣內首次出價的時間順序」指派匿名代號，代號在該拍賣生命週期內固定。
 * 同一車商在不同拍賣可能是不同代號，這是刻意的，避免跨拍賣追蹤。
 */
export function anonCodesFor(bids: Bid[]): Map<string, string> {
  const firstSeen = new Map<string, number>()
  for (const b of [...bids].sort((x, y) => x.at - y.at)) {
    if (!firstSeen.has(b.dealerId)) firstSeen.set(b.dealerId, b.at)
  }
  const codes = new Map<string, string>()
  let i = 0
  for (const dealerId of firstSeen.keys()) {
    codes.set(dealerId, `出價者 ${String.fromCharCode(65 + i)}`)
    i++
  }
  return codes
}

export function myHighestBid(
  data: Pick<EngineData, 'bids'>,
  auctionId: string,
  dealerId: string,
): Bid | null {
  return highestBid(bidsOf(data, auctionId).filter((b) => b.dealerId === dealerId))
}

export function isLeading(
  data: Pick<EngineData, 'bids'>,
  auctionId: string,
  dealerId: string,
): boolean {
  return highestBid(bidsOf(data, auctionId))?.dealerId === dealerId
}

export function isWatched(
  data: Pick<EngineData, 'watches'>,
  auctionId: string,
  dealerId: string,
): boolean {
  return data.watches.some((w) => w.auctionId === auctionId && w.dealerId === dealerId)
}

export function activeProxyOf(
  data: Pick<EngineData, 'proxies'>,
  auctionId: string,
  dealerId: string,
): ProxyBid | null {
  return (
    data.proxies.find((p) => p.auctionId === auctionId && p.dealerId === dealerId && p.active) ??
    null
  )
}

export function notificationsFor(
  notifications: AppNotification[],
  userId: string,
): AppNotification[] {
  return notifications.filter((n) => n.userId === userId).sort((a, b) => b.at - a.at)
}

export function unreadCount(notifications: AppNotification[], userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length
}

export type VehicleFilter = {
  brands?: string[]
  yearFrom?: number
  yearTo?: number
  orderNo?: string
  statuses?: VehicleStatus[]
}

export function filterVehicles(vehicles: Vehicle[], f: VehicleFilter): Vehicle[] {
  const needle = f.orderNo?.trim().toLowerCase()
  return vehicles.filter((v) => {
    if (f.brands?.length && !f.brands.includes(v.brand)) return false
    if (f.yearFrom !== undefined && v.year < f.yearFrom) return false
    if (f.yearTo !== undefined && v.year > f.yearTo) return false
    if (needle && !v.orderNo.toLowerCase().includes(needle)) return false
    if (f.statuses?.length && !f.statuses.includes(v.status)) return false
    return true
  })
}

export type AuctionFilter = Omit<VehicleFilter, 'statuses'> & {
  types?: AuctionType[]
  statuses?: AuctionStatus[]
  /** 只看這些拍賣 id（關注清單、我出價過的） */
  onlyIds?: string[]
}

export function filterAuctions(
  auctions: Auction[],
  vehicles: Vehicle[],
  f: AuctionFilter,
): Auction[] {
  // 刻意不把 statuses 傳進車輛篩選 —— 那是拍賣狀態，不是車輛狀態
  const allowed = new Set(
    filterVehicles(vehicles, {
      brands: f.brands,
      yearFrom: f.yearFrom,
      yearTo: f.yearTo,
      orderNo: f.orderNo,
    }).map((v) => v.id),
  )

  return auctions.filter((a) => {
    if (!allowed.has(a.vehicleId)) return false
    if (f.types?.length && !f.types.includes(a.type)) return false
    if (f.statuses?.length && !f.statuses.includes(a.status)) return false
    if (f.onlyIds && !f.onlyIds.includes(a.id)) return false
    return true
  })
}
