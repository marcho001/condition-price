import { validateBidAmount } from '@/lib/money'
import type { EngineEvent } from '@/engine/events'
import { resolveProxyBids } from '@/engine/proxy'
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

  const placed: Bid = { id: nextId(), auctionId, dealerId, amount, at: now, kind: 'manual' }

  let bids = [...data.bids, placed]
  let nextAuction: Auction = { ...auction }
  let proxies = data.proxies
  let vehicles = data.vehicles

  events.push({ type: 'NEW_BID', auctionId, dealerId, amount })
  if (previousLeader && previousLeader !== dealerId) {
    events.push({ type: 'OUTBID', auctionId, dealerId: previousLeader, reason: 'outbid' })
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
      data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids, proxies },
      events,
    }
  }

  if (!isSealed) {
    const proxyResult = resolveProxyBids({
      auction: nextAuction,
      bids: bidsOf({ bids }, auctionId),
      proxies,
      now,
      nextId,
    })

    bids = [...bids, ...proxyResult.newBids]

    for (const b of proxyResult.newBids) {
      events.push({ type: 'NEW_BID', auctionId, dealerId: b.dealerId, amount: b.amount })
    }
    for (const id of proxyResult.outbidDealerIds) {
      events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'outbid' })
    }
    for (const id of proxyResult.exhaustedDealerIds) {
      events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'proxy_exhausted' })
      proxies = proxies.map((p) =>
        p.auctionId === auctionId && p.dealerId === id ? { ...p, active: false } : p,
      )
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
    data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids, proxies },
    events,
  }
}
