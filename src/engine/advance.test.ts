import { describe, expect, it } from 'vitest'
import { advanceAuctions } from '@/engine/advance'
import {
  T0,
  makeAuction,
  makeBid,
  makeData,
  makeIdGen,
  makeProxy,
  makeVehicle,
} from '@/engine/testFixtures'

describe('開標', () => {
  it('時間到把未開始轉為進行中並發 STARTED', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0, endAt: T0 + 86_400_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('進行中')
    expect(r.data.vehicles[0].status).toBe('拍賣中')
    expect(r.events).toContainEqual({ type: 'STARTED', auctionId: 'a1' })
    expect(r.changed).toBe(true)
  })

  it('時間未到不動作，changed 為 false', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 + 1_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('未開始')
    expect(r.changed).toBe(false)
  })

  it('開標時已有代理出價則立即以起標價進場', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
      proxies: [makeProxy({ dealerId: 'd2', maxAmount: 1_500_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.bids).toHaveLength(1)
    expect(r.data.bids[0]).toMatchObject({ dealerId: 'd2', amount: 500_000, kind: 'proxy' })
  })
})

describe('結標判定', () => {
  it('無出價 → 已流標（無人出價），車輛回到在庫', () => {
    const d = makeData({ auctions: [makeAuction({ endAt: T0 })] })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('無人出價')
    expect(r.data.vehicles[0].status).toBe('在庫')
    expect(r.events).toContainEqual({ type: 'CLOSED_PASSED', auctionId: 'a1', reason: '無人出價' })
  })

  it('達到底價 → 已成交，車輛已售出', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_000_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 2_000_000, at: T0 })
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('差距 9% → 議價中，24 小時期限', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_820_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd1',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: [],
    })
    expect(r.data.vehicles[0].status).toBe('拍賣中')
    expect(r.events).toContainEqual({
      type: 'NEGOTIATION_INVITE',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('差距 11% → 已流標（未達底價）', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_780_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('未達底價')
  })
})

describe('議價期限', () => {
  it('期限到且有次高出價者 → 換人詢問並累加 declinedDealerIds', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          endAt: T0 - 86_400_000,
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [
        makeBid({ dealerId: 'd1', amount: 1_850_000 }),
        makeBid({ dealerId: 'd2', amount: 1_830_000 }),
      ],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd2',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: ['d1'],
    })
  })

  it('期限到且無次高者 → 已流標（議價失敗）', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          endAt: T0 - 86_400_000,
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [makeBid({ dealerId: 'd1', amount: 1_850_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('議價失敗')
    expect(r.data.vehicles[0].status).toBe('在庫')
  })
})

describe('提醒類事件', () => {
  it('結標前 10 分鐘內發一次 ENDING_SOON', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'ENDING_SOON', auctionId: 'a1' })
  })

  it('ENDING_SOON 只發一次', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const second = advanceAuctions(first.data, T0 + 1_000, makeIdGen())
    expect(second.events.some((e) => e.type === 'ENDING_SOON')).toBe(false)
  })

  it('延長後重新進入 10 分鐘窗口會再發一次 ENDING_SOON', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const extended = {
      ...first.data,
      auctions: [{ ...first.data.auctions[0], endAt: T0 + 300_000 + 180_000, extendedMs: 180_000 }],
    }
    const second = advanceAuctions(extended, T0 + 1_000, makeIdGen())
    expect(second.events).toContainEqual({ type: 'ENDING_SOON', auctionId: 'a1' })
  })

  it('開標滿 2 天無人出價發一次 NO_BID_ALERT', () => {
    const d = makeData({
      auctions: [makeAuction({ startAt: T0 - 172_800_000, endAt: T0 + 86_400_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'NO_BID_ALERT', auctionId: 'a1' })
    const again = advanceAuctions(r.data, T0 + 1_000, makeIdGen())
    expect(again.events.some((e) => e.type === 'NO_BID_ALERT')).toBe(false)
  })

  it('結標前 1 小時未達底價發一次 ENDING_BELOW_RESERVE', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 1_800_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_000_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'ENDING_BELOW_RESERVE', auctionId: 'a1' })
  })

  it('已達底價不發 ENDING_BELOW_RESERVE', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 1_800_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_100_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events.some((e) => e.type === 'ENDING_BELOW_RESERVE')).toBe(false)
  })
})

describe('冪等性與快轉', () => {
  it('同一個 now 重複呼叫，狀態與事件皆相同', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_000_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const second = advanceAuctions(first.data, T0, makeIdGen())
    expect(second.events).toEqual([])
    expect(second.changed).toBe(false)
    expect(second.data.auctions[0]).toEqual(first.data.auctions[0])
  })

  it('從開標前一次快轉到結標後，狀態正確且 ENDING_SOON 只出現一次', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0, endAt: T0 + 3_600_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0 + 7_200_000, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('無人出價')
    expect(r.events.filter((e) => e.type === 'ENDING_SOON')).toHaveLength(1)
    expect(r.events.filter((e) => e.type === 'STARTED')).toHaveLength(1)
  })

  it('已成交或已流標的拍賣不再產生任何事件', () => {
    const d = makeData({
      auctions: [
        makeAuction({ status: '已流標', endAt: T0 - 86_400_000, closeReason: '無人出價' }),
      ],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })

  it('已撤標的拍賣不再產生任何事件', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '已撤標', withdrawReason: '借款人清償' })],
    })
    const r = advanceAuctions(d, T0 + 86_400_000 * 10, makeIdGen())
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })
})

describe('不變性', () => {
  it('不修改傳入的 data', () => {
    const d = makeData({ auctions: [makeAuction({ endAt: T0 })] })
    advanceAuctions(d, T0, makeIdGen())
    expect(d.auctions[0].status).toBe('進行中')
  })
})
