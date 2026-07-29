import type { EngineEvent } from '@/engine/events'
import { NEGOTIATION_WINDOW_MS, highestBid, resolveClose } from '@/engine/rules'
import type { Auction, AuctionStatus, Bid, EngineData, Vehicle } from '@/types'

export type ActionResult = { data: EngineData; events: EngineEvent[]; error?: string }

const WITHDRAWABLE = new Set<AuctionStatus>(['未開始', '進行中'])

function patch(data: EngineData, auction: Auction, vehicleStatus?: Vehicle['status']): EngineData {
  return {
    ...data,
    auctions: data.auctions.map((a) => (a.id === auction.id ? auction : a)),
    vehicles: vehicleStatus
      ? data.vehicles.map((v) => (v.id === auction.vehicleId ? { ...v, status: vehicleStatus } : v))
      : data.vehicles,
  }
}

function find(data: EngineData, auctionId: string): Auction | undefined {
  return data.auctions.find((a) => a.id === auctionId)
}

function bidsOf(data: EngineData, auctionId: string): Bid[] {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function withdrawAuction(
  data: EngineData,
  args: { auctionId: string; reason: string; byUserId: string },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (!WITHDRAWABLE.has(auction.status)) {
    return { data, events: [], error: '只有未開始或進行中的拍賣可以撤標' }
  }
  if (args.reason.trim().length < 5) {
    return { data, events: [], error: '撤標理由至少需 5 個字' }
  }

  const next: Auction = {
    ...auction,
    status: '已撤標',
    withdrawReason: args.reason.trim(),
    withdrawnBy: args.byUserId,
    negotiation: undefined,
  }
  const withVehicle = patch(data, next, '已下架')

  return {
    data: {
      ...withVehicle,
      proxies: withVehicle.proxies.map((p) =>
        p.auctionId === auction.id ? { ...p, active: false } : p,
      ),
    },
    events: [{ type: 'WITHDRAWN', auctionId: auction.id }],
  }
}

export function acceptNegotiation(
  data: EngineData,
  args: { auctionId: string; dealerId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (auction.negotiation.dealerId !== args.dealerId) {
    return { data, events: [], error: '您不是這筆議價的邀請對象' }
  }

  const amount = auction.negotiation.amount
  const next: Auction = {
    ...auction,
    status: '已成交',
    deal: { dealerId: args.dealerId, amount, at: args.now },
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '已售出'),
    events: [{ type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: args.dealerId, amount }],
  }
}

export function declineNegotiation(
  data: EngineData,
  args: { auctionId: string; dealerId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (auction.negotiation.dealerId !== args.dealerId) {
    return { data, events: [], error: '您不是這筆議價的邀請對象' }
  }

  const declined = [...auction.negotiation.declinedDealerIds, args.dealerId]
  const outcome = resolveClose(auction, bidsOf(data, auction.id), declined)

  if (outcome.kind === 'negotiate') {
    const next: Auction = {
      ...auction,
      negotiation: {
        dealerId: outcome.dealerId,
        amount: outcome.amount,
        deadline: args.now + NEGOTIATION_WINDOW_MS,
        declinedDealerIds: declined,
      },
    }
    return {
      data: patch(data, next),
      events: [
        {
          type: 'NEGOTIATION_INVITE',
          auctionId: auction.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        },
      ],
    }
  }

  if (outcome.kind === 'deal') {
    const next: Auction = {
      ...auction,
      status: '已成交',
      deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: args.now },
      negotiation: undefined,
    }
    return {
      data: patch(data, next, '已售出'),
      events: [
        {
          type: 'CLOSED_DEAL',
          auctionId: auction.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        },
      ],
    }
  }

  const next: Auction = {
    ...auction,
    status: '已流標',
    closeReason: outcome.reason,
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '在庫'),
    events: [{ type: 'CLOSED_PASSED', auctionId: auction.id, reason: outcome.reason }],
  }
}

export function acceptHighestBid(
  data: EngineData,
  args: { auctionId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中') {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  const top = highestBid(bidsOf(data, auction.id))
  if (!top) return { data, events: [], error: '這筆拍賣沒有任何出價' }

  const next: Auction = {
    ...auction,
    status: '已成交',
    deal: { dealerId: top.dealerId, amount: top.amount, at: args.now },
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '已售出'),
    events: [
      { type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: top.dealerId, amount: top.amount },
    ],
  }
}

export function adjustReserve(
  data: EngineData,
  args: { auctionId: string; reservePrice: number; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (args.reservePrice > auction.reservePrice) {
    return { data, events: [], error: '底價只能調降' }
  }

  const lowered: Auction = { ...auction, reservePrice: args.reservePrice }
  const top = highestBid(bidsOf(data, auction.id))

  // 車商已經出到那個價，沒有理由讓他改付新底價 —— 成交金額用最高出價
  if (top && top.amount >= args.reservePrice) {
    const next: Auction = {
      ...lowered,
      status: '已成交',
      deal: { dealerId: top.dealerId, amount: top.amount, at: args.now },
      negotiation: undefined,
    }
    return {
      data: patch(data, next, '已售出'),
      events: [
        { type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: top.dealerId, amount: top.amount },
      ],
    }
  }

  const next: Auction = {
    ...lowered,
    negotiation: { ...auction.negotiation, amount: args.reservePrice },
  }
  return {
    data: patch(data, next),
    events: [
      {
        type: 'NEGOTIATION_INVITE',
        auctionId: auction.id,
        dealerId: auction.negotiation.dealerId,
        amount: args.reservePrice,
      },
    ],
  }
}
