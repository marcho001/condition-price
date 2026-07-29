import { beforeEach, describe, expect, it } from 'vitest'
import type { Auction, Bid, ProxyBid } from '@/types'
import { resolveProxyBids } from '@/engine/proxy'

const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 86_400_000,
    originalEndAt: T0 + 86_400_000,
    startPrice: 500_000,
    reservePrice: 2_000_000,
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

function proxy(dealerId: string, maxAmount: number, createdAt = T0): ProxyBid {
  return { auctionId: 'a1', dealerId, maxAmount, active: true, createdAt }
}

let counter = 0
const nextId = () => `p${++counter}`
beforeEach(() => {
  counter = 0
})

describe('resolveProxyBids', () => {
  it('沒有代理時不產生任何出價', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 600_000)],
      proxies: [],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('代理只出打敗目前最高價所需的最小金額', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toHaveLength(1)
    expect(r.newBids[0]).toMatchObject({ dealerId: 'd2', amount: 710_000, kind: 'proxy' })
    expect(r.outbidDealerIds).toEqual(['d1'])
  })

  it('目前領先者自己的代理不會自我加價', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d2', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('領先者的代理在受到威脅時會回應', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d2', 700_000)],
      proxies: [proxy('d2', 1_500_000), proxy('d3', 900_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids.map((b) => [b.dealerId, b.amount])).toEqual([
      ['d3', 900_000],
      ['d2', 910_000],
    ])
    expect(r.exhaustedDealerIds).toEqual(['d3'])
  })

  it('代理上限不足以加一級距時不出價，並標記為用盡', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 705_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
    expect(r.exhaustedDealerIds).toEqual(['d2'])
  })

  it('兩方代理互頂，價格停在較低上限加一級距，較高上限者領先', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_000_000), proxy('d3', 900_000)],
      now: T0,
      nextId,
    })
    const last = r.newBids[r.newBids.length - 1]
    expect(last.dealerId).toBe('d2')
    expect(last.amount).toBe(910_000)
    expect(r.exhaustedDealerIds).toContain('d3')
  })

  it('代理上限相同時較早設定者以該金額領先', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d3', 1_000_000, T0 + 5_000), proxy('d2', 1_000_000, T0)],
      now: T0,
      nextId,
    })
    const last = r.newBids[r.newBids.length - 1]
    expect(last.dealerId).toBe('d2')
    expect(r.exhaustedDealerIds).toContain('d3')
  })

  it('代理加到自己的上限就停住，不會超過', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 990_000)],
      proxies: [proxy('d2', 1_000_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toHaveLength(1)
    expect(r.newBids[0].amount).toBe(1_000_000)
  })

  it('上限與目前價之間湊不到一個完整級距時不出價', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 995_000)],
      proxies: [proxy('d2', 1_000_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
    expect(r.exhaustedDealerIds).toEqual(['d2'])
  })

  it('次高也是代理時，出價紀錄看得出競價過程', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_000_000), proxy('d3', 900_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids.map((b) => [b.dealerId, b.amount])).toEqual([
      ['d3', 900_000],
      ['d2', 910_000],
    ])
  })

  it('已停用的代理不參與', () => {
    const p = { ...proxy('d2', 1_500_000), active: false }
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [p],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('無人出價時代理以起標價進場', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids[0].amount).toBe(500_000)
    expect(r.outbidDealerIds).toEqual([])
  })

  it('產生的出價 id 來自 nextId，且時間為 now', () => {
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0 + 999,
      nextId,
    })
    expect(r.newBids[0].id).toBe('p1')
    expect(r.newBids[0].at).toBe(T0 + 999)
  })
})
