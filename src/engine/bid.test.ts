import { describe, expect, it } from 'vitest'
import { placeBid } from '@/engine/bid'
import { T0, makeAuction, makeData, makeIdGen } from '@/engine/testFixtures'

describe('placeBid 基本行為', () => {
  it('第一筆出價金額必須等於起標價', () => {
    const r = placeBid(makeData(), {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.error).toBeUndefined()
    expect(r.data.bids).toHaveLength(1)
    expect(r.data.bids[0]).toMatchObject({ dealerId: 'd1', amount: 500_000 })
  })

  it('產生 NEW_BID 事件', () => {
    const r = placeBid(makeData(), {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.events).toEqual([
      { type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 500_000 },
    ])
  })

  it('第二筆出價超越第一筆時對前者發 OUTBID', () => {
    const d = placeBid(makeData(), {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    }).data
    const r = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 510_000,
      now: T0 + 1_000,
      nextId: makeIdGen(),
    })
    expect(r.events).toContainEqual({ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1' })
  })
})

describe('placeBid 拒絕的情況', () => {
  it('拍賣不存在', () => {
    const r = placeBid(makeData(), {
      auctionId: 'nope',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.error).toBe('找不到這筆拍賣')
    expect(r.data.bids).toHaveLength(0)
  })

  it('拍賣未開始', () => {
    const d = makeData({ auctions: [makeAuction({ status: '未開始', startAt: T0 + 3_600_000 })] })
    const r = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.error).toBe('拍賣尚未開始')
  })

  it('拍賣已結束', () => {
    const d = makeData({ auctions: [makeAuction({ status: '已成交' })] })
    const r = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.error).toBe('拍賣已結束')
  })

  it('金額低於合法出價', () => {
    const r = placeBid(makeData(), {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 490_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.error).toBe('至少需出 ¥500,000')
  })

  it('密封投標同一家車商不得投第二次', () => {
    const d = makeData({ auctions: [makeAuction({ type: 'SEALED' })] })
    const first = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 600_000,
      now: T0,
      nextId: makeIdGen(),
    })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 700_000,
      now: T0 + 1_000,
      nextId: makeIdGen(),
    })
    expect(second.error).toBe('密封投標每家車商僅能投標一次')
    expect(second.data.bids).toHaveLength(1)
  })
})

describe('placeBid 密封投標的特殊規則', () => {
  it('密封投標不必高於他人出價，只需達到起標價', () => {
    const d = makeData({ auctions: [makeAuction({ type: 'SEALED' })] })
    const first = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 900_000,
      now: T0,
      nextId: makeIdGen(),
    })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 600_000,
      now: T0 + 1_000,
      nextId: makeIdGen(),
    })
    expect(second.error).toBeUndefined()
    expect(second.data.bids).toHaveLength(2)
  })

  it('密封投標不發 OUTBID', () => {
    const d = makeData({ auctions: [makeAuction({ type: 'SEALED' })] })
    const first = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 600_000,
      now: T0,
      nextId: makeIdGen(),
    })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 900_000,
      now: T0 + 1_000,
      nextId: makeIdGen(),
    })
    expect(second.events.some((e) => e.type === 'OUTBID')).toBe(false)
  })

  it('達到立即成交價立刻成交，不等結標時間', () => {
    const d = makeData({ auctions: [makeAuction({ type: 'SEALED', buyNowPrice: 1_800_000 })] })
    const r = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 1_800_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_800_000, at: T0 })
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 1_800_000,
    })
  })
})

describe('placeBid 軟結標', () => {
  it('結標前 2 分鐘出價會延長 3 分鐘並發 EXTENDED', () => {
    const d = makeData({ auctions: [makeAuction({ endAt: T0 + 120_000 })] })
    const r = placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.data.auctions[0].endAt).toBe(T0 + 120_000 + 180_000)
    expect(r.data.auctions[0].extendedMs).toBe(180_000)
    expect(r.data.auctions[0].originalEndAt).toBe(T0 + 120_000)
    expect(r.events).toContainEqual({ type: 'EXTENDED', auctionId: 'a1', extendedMs: 180_000 })
  })

  it('距結標還久不延長也不發 EXTENDED', () => {
    const r = placeBid(makeData(), {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(r.data.auctions[0].endAt).toBe(T0 + 86_400_000)
    expect(r.events.some((e) => e.type === 'EXTENDED')).toBe(false)
  })
})

describe('placeBid 不變性', () => {
  it('不修改傳入的 data', () => {
    const d = makeData()
    placeBid(d, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 500_000,
      now: T0,
      nextId: makeIdGen(),
    })
    expect(d.bids).toHaveLength(0)
    expect(d.auctions[0].endAt).toBe(T0 + 86_400_000)
  })
})
