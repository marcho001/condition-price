import { describe, expect, it } from 'vitest'
import {
  acceptHighestBid,
  acceptNegotiation,
  adjustReserve,
  declineNegotiation,
  withdrawAuction,
} from '@/engine/actions'
import { T0, makeAuction, makeBid, makeData, makeProxy, makeVehicle } from '@/engine/testFixtures'

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

describe('withdrawAuction', () => {
  it('未開始的拍賣可撤標，車輛轉為已下架', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 + 3_600_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = withdrawAuction(d, {
      auctionId: 'a1',
      reason: '借款人已清償欠款',
      byUserId: 'u-staff',
    })
    expect(r.error).toBeUndefined()
    expect(r.data.auctions[0].status).toBe('已撤標')
    expect(r.data.auctions[0].withdrawReason).toBe('借款人已清償欠款')
    expect(r.data.auctions[0].withdrawnBy).toBe('u-staff')
    expect(r.data.vehicles[0].status).toBe('已下架')
    expect(r.events).toEqual([{ type: 'WITHDRAWN', auctionId: 'a1' }])
  })

  it('進行中的拍賣可撤標', () => {
    const r = withdrawAuction(makeData(), {
      auctionId: 'a1',
      reason: '車輛有查扣爭議',
      byUserId: 'u-staff',
    })
    expect(r.data.auctions[0].status).toBe('已撤標')
  })

  it('理由少於 5 字被拒', () => {
    const r = withdrawAuction(makeData(), {
      auctionId: 'a1',
      reason: '不賣',
      byUserId: 'u-staff',
    })
    expect(r.error).toBe('撤標理由至少需 5 個字')
    expect(r.data.auctions[0].status).toBe('進行中')
  })

  it('已成交的拍賣不可撤標', () => {
    const d = makeData({ auctions: [makeAuction({ status: '已成交' })] })
    const r = withdrawAuction(d, {
      auctionId: 'a1',
      reason: '想要下架這台車',
      byUserId: 'u-staff',
    })
    expect(r.error).toBe('只有未開始或進行中的拍賣可以撤標')
  })

  it('停用該拍賣所有代理出價', () => {
    const d = makeData({ proxies: [makeProxy({ dealerId: 'd2', maxAmount: 1_000_000 })] })
    const r = withdrawAuction(d, {
      auctionId: 'a1',
      reason: '借款人已清償欠款',
      byUserId: 'u-staff',
    })
    expect(r.data.proxies[0].active).toBe(false)
  })
})

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
