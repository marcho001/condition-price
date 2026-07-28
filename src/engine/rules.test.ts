import { describe, expect, it } from 'vitest'
import type { Auction, Bid } from '@/types'
import { highestBid, resolveClose, softCloseExtension } from '@/engine/rules'

const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 600_000,
    originalEndAt: T0 + 600_000,
    startPrice: 500_000,
    reservePrice: 1_000_000,
    stepMode: 'auto',
    extendedMs: 0,
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

function bid(dealerId: string, amount: number, at = T0): Bid {
  return { id: `b-${dealerId}-${amount}`, auctionId: 'a1', dealerId, amount, at, kind: 'manual' }
}

describe('softCloseExtension 定時開標', () => {
  it('結標前 3 分鐘內出價延長 3 分鐘', () => {
    expect(softCloseExtension(auction({ endAt: T0 + 120_000 }), T0)).toBe(180_000)
  })
  it('結標前 4 分鐘出價不延長', () => {
    expect(softCloseExtension(auction({ endAt: T0 + 240_000 }), T0)).toBe(0)
  })
  it('剛好等於窗口邊界不延長', () => {
    expect(softCloseExtension(auction({ endAt: T0 + 180_000 }), T0)).toBe(0)
  })
  it('累計延長達 60 分鐘上限後不再延長', () => {
    expect(softCloseExtension(auction({ endAt: T0 + 60_000, extendedMs: 3_600_000 }), T0)).toBe(0)
  })
  it('接近上限時只延長到上限為止', () => {
    expect(
      softCloseExtension(auction({ endAt: T0 + 60_000, extendedMs: 3_600_000 - 60_000 }), T0),
    ).toBe(60_000)
  })
})

describe('softCloseExtension 其他拍賣方式', () => {
  it('即時同步拍用 15 秒窗口', () => {
    expect(softCloseExtension(auction({ type: 'LIVE', endAt: T0 + 10_000 }), T0)).toBe(15_000)
  })
  it('即時同步拍無延長上限', () => {
    expect(
      softCloseExtension(auction({ type: 'LIVE', endAt: T0 + 10_000, extendedMs: 10 * 3_600_000 }), T0),
    ).toBe(15_000)
  })
  it('密封投標不延長', () => {
    expect(softCloseExtension(auction({ type: 'SEALED', endAt: T0 + 1_000 }), T0)).toBe(0)
  })
})

describe('highestBid', () => {
  it('無出價回傳 null', () => {
    expect(highestBid([])).toBeNull()
  })
  it('回傳金額最高者', () => {
    expect(highestBid([bid('d1', 100), bid('d2', 300), bid('d3', 200)])!.dealerId).toBe('d2')
  })
  it('同額時較早出價者勝', () => {
    const early = bid('d1', 300, T0)
    const late = bid('d2', 300, T0 + 1_000)
    expect(highestBid([late, early])!.dealerId).toBe('d1')
  })
  it('排除指定車商', () => {
    expect(highestBid([bid('d1', 300), bid('d2', 200)], ['d1'])!.dealerId).toBe('d2')
  })
})

describe('resolveClose', () => {
  it('無出價為流標，原因為無人出價', () => {
    expect(resolveClose(auction(), [])).toEqual({ kind: 'passed', reason: '無人出價' })
  })
  it('最高價達到底價為成交', () => {
    expect(resolveClose(auction(), [bid('d1', 1_000_000)])).toEqual({
      kind: 'deal',
      dealerId: 'd1',
      amount: 1_000_000,
    })
  })
  it('最高價超過底價為成交', () => {
    expect(resolveClose(auction(), [bid('d1', 1_200_000)])).toEqual({
      kind: 'deal',
      dealerId: 'd1',
      amount: 1_200_000,
    })
  })
  it('差距 9% 進入議價，金額為底價', () => {
    expect(resolveClose(auction(), [bid('d1', 910_000)])).toEqual({
      kind: 'negotiate',
      dealerId: 'd1',
      amount: 1_000_000,
    })
  })
  it('差距剛好 10% 不進議價', () => {
    expect(resolveClose(auction(), [bid('d1', 900_000)])).toEqual({
      kind: 'passed',
      reason: '未達底價',
    })
  })
  it('差距 11% 為流標', () => {
    expect(resolveClose(auction(), [bid('d1', 890_000)])).toEqual({
      kind: 'passed',
      reason: '未達底價',
    })
  })
  it('排除已放棄議價者後改問次高', () => {
    const bids = [bid('d1', 950_000), bid('d2', 930_000)]
    expect(resolveClose(auction(), bids, ['d1'])).toEqual({
      kind: 'negotiate',
      dealerId: 'd2',
      amount: 1_000_000,
    })
  })
  it('全部放棄後為議價失敗', () => {
    expect(resolveClose(auction(), [bid('d1', 950_000)], ['d1'])).toEqual({
      kind: 'passed',
      reason: '議價失敗',
    })
  })
})
