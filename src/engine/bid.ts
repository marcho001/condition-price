import { validateBidAmount } from '@/lib/money'
import type { EngineEvent } from '@/engine/events'
import { highestBid, softCloseExtension } from '@/engine/rules'
import type { Auction, Bid, EngineData } from '@/types'

export function bidsOf(data: Pick<EngineData, 'bids'>, auctionId: string): Bid[] {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function currentPriceOf(
  data: Pick<EngineData, 'bids'>,
  auctionId: string,
): number | null {
  return highestBid(bidsOf(data, auctionId))?.amount ?? null
}

function replace(auctions: Auction[], next: Auction): Auction[] {
  return auctions.map((a) => (a.id === next.id ? next : a))
}

export function placeBid(
  data: EngineData,
  args: { auctionId: string; dealerId: string; amount: number; now: number; nextId: () => string },
): { data: EngineData; events: EngineEvent[]; error?: string } {
  const { auctionId, dealerId, amount, now, nextId } = args
  const auction = data.auctions.find((a) => a.id === auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status === '未開始') return { data, events: [], error: '拍賣尚未開始' }
  if (auction.status !== '進行中') return { data, events: [], error: '拍賣已結束' }

  const existing = bidsOf(data, auctionId)
  const isSealed = auction.type === 'SEALED'

  if (isSealed && existing.some((b) => b.dealerId === dealerId)) {
    return { data, events: [], error: '密封投標每家車商僅能投標一次' }
  }

  // 密封投標看不到他人出價，因此門檻是起標價而非目前最高價
  const basePrice = isSealed ? null : (highestBid(existing)?.amount ?? null)
  const check = validateBidAmount(auction, basePrice, amount)
  if (!check.ok) return { data, events: [], error: check.reason }

  const events: EngineEvent[] = []
  const previousLeader = isSealed ? null : (highestBid(existing)?.dealerId ?? null)

  const placed: Bid = { id: nextId(), auctionId, dealerId, amount, at: now }

  const bids = [...data.bids, placed]
  let nextAuction: Auction = { ...auction }
  let vehicles = data.vehicles

  events.push({ type: 'NEW_BID', auctionId, dealerId, amount })
  if (previousLeader && previousLeader !== dealerId) {
    events.push({ type: 'OUTBID', auctionId, dealerId: previousLeader })
  }

  // 立即成交價：僅密封投標可設
  if (isSealed && nextAuction.buyNowPrice && amount >= nextAuction.buyNowPrice) {
    nextAuction = {
      ...nextAuction,
      status: '已成交',
      deal: { dealerId, amount, at: now },
    }
    vehicles = vehicles.map((v) =>
      v.id === nextAuction.vehicleId ? { ...v, status: '已售出' } : v,
    )
    events.push({ type: 'CLOSED_DEAL', auctionId, dealerId, amount })
    return {
      data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids },
      events,
    }
  }

  // 軟結標只判定一次，用的是延長前的 endAt；originalEndAt 刻意不動
  const extension = softCloseExtension(nextAuction, now)
  if (extension > 0) {
    nextAuction = {
      ...nextAuction,
      endAt: nextAuction.endAt + extension,
      extendedMs: nextAuction.extendedMs + extension,
    }
    events.push({ type: 'EXTENDED', auctionId, extendedMs: extension })
  }

  return {
    data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids },
    events,
  }
}
