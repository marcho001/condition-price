import { priceGapRatio } from '@/lib/money'
import type { Auction, AuctionType, Bid, CloseReason } from '@/types'

export const SOFT_CLOSE: Record<
  AuctionType,
  { windowMs: number; extendMs: number; capMs: number } | null
> = {
  SCHEDULED: { windowMs: 180_000, extendMs: 180_000, capMs: 3_600_000 },
  LIVE: { windowMs: 15_000, extendMs: 15_000, capMs: Number.POSITIVE_INFINITY },
  SEALED: null,
}

export const NEGOTIATION_THRESHOLD = 0.1
export const NEGOTIATION_WINDOW_MS = 86_400_000
export const ENDING_SOON_LEAD_MS = 600_000
export const NO_BID_ALERT_MS = 172_800_000
export const BELOW_RESERVE_LEAD_MS = 3_600_000

/**
 * 回傳這次出價應該延長的毫秒數，0 表示不延長。
 * 用嚴格小於判斷剩餘時間，所以剛好等於窗口長度時不延長。
 */
export function softCloseExtension(auction: Auction, bidAt: number): number {
  const cfg = SOFT_CLOSE[auction.type]
  if (!cfg) return 0
  const remaining = auction.endAt - bidAt
  if (remaining < 0 || remaining >= cfg.windowMs) return 0
  const room = cfg.capMs - auction.extendedMs
  if (room <= 0) return 0
  return Math.min(cfg.extendMs, room)
}

export function highestBid(bids: Bid[], excludeDealerIds: string[] = []): Bid | null {
  const pool = bids.filter((b) => !excludeDealerIds.includes(b.dealerId))
  if (pool.length === 0) return null
  return pool.reduce((best, b) => {
    if (b.amount > best.amount) return b
    if (b.amount === best.amount && b.at < best.at) return b
    return best
  })
}

export type CloseOutcome =
  | { kind: 'deal'; dealerId: string; amount: number }
  | { kind: 'negotiate'; dealerId: string; amount: number }
  | { kind: 'passed'; reason: CloseReason }

export function resolveClose(
  auction: Auction,
  bids: Bid[],
  excludeDealerIds: string[] = [],
): CloseOutcome {
  if (bids.length === 0) return { kind: 'passed', reason: '無人出價' }

  const top = highestBid(bids, excludeDealerIds)
  // 有人出過價但全都放棄議價了
  if (!top) return { kind: 'passed', reason: '議價失敗' }

  if (top.amount >= auction.reservePrice) {
    return { kind: 'deal', dealerId: top.dealerId, amount: top.amount }
  }
  if (priceGapRatio(auction.reservePrice, top.amount) < NEGOTIATION_THRESHOLD) {
    return { kind: 'negotiate', dealerId: top.dealerId, amount: auction.reservePrice }
  }
  return {
    kind: 'passed',
    reason: excludeDealerIds.length > 0 ? '議價失敗' : '未達底價',
  }
}
