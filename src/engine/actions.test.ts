import { describe, expect, it } from 'vitest'
import {
  acceptHighestBid,
  acceptNegotiation,
  adjustReserve,
  declineNegotiation,
} from '@/engine/actions'
import { T0, makeAuction, makeBid, makeData } from '@/engine/testFixtures'

function negotiating() {
  return makeData({
    auctions: [
      makeAuction({
        status: '議價中',
        endAt: T0 - 3_600_000,
        negotiation: {
          dealerId: 'd1',
          amount: 2_000_000,
          deadline: T0 + 86_400_000,
          declinedDealerIds: [],
        },
      }),
    ],
    bids: [
      makeBid({ dealerId: 'd1', amount: 1_850_000 }),
      makeBid({ dealerId: 'd2', amount: 1_830_000 }),
    ],
  })
}

describe('acceptNegotiation', () => {
  it('被邀請的車商接受，以底價成交', () => {
    const r = acceptNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 2_000_000, at: T0 })
    expect(r.data.auctions[0].negotiation).toBeUndefined()
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('非被邀請的車商不能接受', () => {
    const r = acceptNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd2', now: T0 })
    expect(r.error).toBe('您不是這筆議價的邀請對象')
    expect(r.data.auctions[0].status).toBe('議價中')
  })

  it('不在議價中的拍賣不能接受', () => {
    const r = acceptNegotiation(makeData(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.error).toBe('這筆拍賣目前不在議價中')
  })
})

describe('declineNegotiation', () => {
  it('放棄後改邀次高出價者，期限重設', () => {
    const r = declineNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd2',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: ['d1'],
    })
    expect(r.events).toContainEqual({
      type: 'NEGOTIATION_INVITE',
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 2_000_000,
    })
  })

  it('無次高者時轉為議價失敗', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0 + 86_400_000,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [makeBid({ dealerId: 'd1', amount: 1_850_000 })],
    })
    const r = declineNegotiation(d, { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('議價失敗')
    expect(r.data.vehicles[0].status).toBe('在庫')
  })
})

describe('acceptHighestBid（公司人員直接接受未達底價的最高價）', () => {
  it('以最高出價成交，而非底價', () => {
    const r = acceptHighestBid(negotiating(), { auctionId: 'a1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_850_000, at: T0 })
  })

  it('不在議價中的拍賣不可用', () => {
    const r = acceptHighestBid(makeData(), { auctionId: 'a1', now: T0 })
    expect(r.error).toBe('這筆拍賣目前不在議價中')
  })
})

describe('adjustReserve（公司人員調降底價）', () => {
  it('調降到最高價之下即立即成交，成交金額為最高出價', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 1_800_000, now: T0 })
    expect(r.data.auctions[0].reservePrice).toBe(1_800_000)
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_850_000, at: T0 })
  })

  it('調降後仍高於最高價則維持議價，並更新議價金額', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 1_900_000, now: T0 })
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation!.amount).toBe(1_900_000)
    expect(r.data.auctions[0].negotiation!.dealerId).toBe('d1')
  })

  it('調高底價被拒', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 2_100_000, now: T0 })
    expect(r.error).toBe('底價只能調降')
  })
})
