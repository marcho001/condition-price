import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '@/data/scenarios'
import { advanceAuctions } from '@/engine/advance'
import { DEALER_A_ID } from '@/data/users'
import { currentPrice, myHighestBid } from '@/store/selectors'
import type { AuctionStatus } from '@/types'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

const VEHICLE_STATUS_FOR: Record<AuctionStatus, string> = {
  未開始: '已排拍',
  進行中: '拍賣中',
  議價中: '拍賣中',
  已成交: '已售出',
  已流標: '在庫',
  已撤標: '已下架',
}

const find = (key: string) => SCENARIOS.find((s) => s.key === key)!

describe('每個情境的基本健全性', () => {
  it('共有 6 個情境，key 不重複', () => {
    expect(SCENARIOS).toHaveLength(6)
    expect(new Set(SCENARIOS.map((s) => s.key)).size).toBe(6)
  })

  for (const scenario of SCENARIOS) {
    it(`「${scenario.label}」載入後立刻跑引擎不會噴事件`, () => {
      const { data } = scenario.build(NOW)
      let n = 0
      const r = advanceAuctions(data, NOW, () => `x${++n}`)
      expect(r.events).toEqual([])
    })

    it(`「${scenario.label}」車輛狀態與拍賣狀態一致`, () => {
      const { data } = scenario.build(NOW)
      for (const a of data.auctions) {
        const v = data.vehicles.find((x) => x.id === a.vehicleId)!
        expect(v.status).toBe(VEHICLE_STATUS_FOR[a.status])
      }
    })

    it(`「${scenario.label}」出價金額不低於起標價`, () => {
      const { data } = scenario.build(NOW)
      for (const b of data.bids) {
        const a = data.auctions.find((x) => x.id === b.auctionId)!
        expect(b.amount).toBeGreaterThanOrEqual(a.startPrice)
      }
    })

    it(`「${scenario.label}」endAt 與 extendedMs 一致`, () => {
      const { data } = scenario.build(NOW)
      for (const a of data.auctions) {
        expect(a.endAt - a.originalEndAt).toBe(a.extendedMs)
      }
    })
  }
})

describe('各情境的關鍵條件', () => {
  it('ending-soon：2 分鐘內結標、8 次出價、山田領先', () => {
    const { data } = find('ending-soon').build(NOW)
    const a = data.auctions.find((x) => x.status === '進行中' && x.endAt - NOW <= 2 * 60_000)!
    expect(a).toBeDefined()

    const bids = data.bids.filter((b) => b.auctionId === a.id)
    expect(bids).toHaveLength(8)
    const top = bids.reduce((best, b) => (b.amount > best.amount ? b : best))
    expect(top.dealerId).toBe(DEALER_A_ID)
  })

  it('outbid：山田有出價但不領先，且有未讀 OUTBID', () => {
    const { data, notifications } = find('outbid').build(NOW)
    const a = data.auctions.find((x) => x.id === 'a-run-normal')!

    expect(myHighestBid(data, a.id, DEALER_A_ID)).not.toBeNull()
    const top = data.bids
      .filter((b) => b.auctionId === a.id)
      .reduce((best, b) => (b.amount > best.amount ? b : best))
    expect(top.dealerId).not.toBe(DEALER_A_ID)
    expect(
      notifications.some((n) => n.userId === DEALER_A_ID && n.type === 'OUTBID' && !n.read),
    ).toBe(true)
  })

  it('extended：已延長 9 分鐘', () => {
    const { data } = find('extended').build(NOW)
    const a = data.auctions.find((x) => x.extendedMs === 9 * 60_000)!
    expect(a).toBeDefined()
    expect(a.endAt - a.originalEndAt).toBe(9 * 60_000)
  })

  it('negotiating：議價對象是山田，最高價低於底價且差距小於 10%', () => {
    const { data } = find('negotiating').build(NOW)
    const a = data.auctions.find((x) => x.status === '議價中' && x.id === 'a-run-normal')!

    expect(a.negotiation!.dealerId).toBe(DEALER_A_ID)
    expect(a.negotiation!.deadline).toBeGreaterThan(NOW)
    const top = currentPrice(data, a.id)!
    expect(top).toBeLessThan(a.reservePrice)
    expect((a.reservePrice - top) / a.reservePrice).toBeLessThan(0.1)
  })

  it('sealed：密封標 3 家投標，山田未投標', () => {
    const { data } = find('sealed').build(NOW)
    const a = data.auctions.find((x) => x.id === 'a-run-sealed')!
    const bids = data.bids.filter((b) => b.auctionId === a.id)

    expect(new Set(bids.map((b) => b.dealerId)).size).toBe(3)
    expect(bids.some((b) => b.dealerId === DEALER_A_ID)).toBe(false)
  })

  it('proxy-war：兩筆代理、有代理出價、價格已被推高', () => {
    const { data } = find('proxy-war').build(NOW)
    const a = data.auctions.find((x) => x.id === 'a-run-normal')!

    expect(data.proxies.filter((p) => p.auctionId === a.id)).toHaveLength(2)
    expect(data.bids.some((b) => b.auctionId === a.id && b.kind === 'proxy')).toBe(true)
    expect(currentPrice(data, a.id)!).toBeGreaterThan(a.startPrice)
  })
})

describe('情境的決定性', () => {
  for (const scenario of SCENARIOS) {
    it(`「${scenario.label}」同一個 now 呼叫兩次結果相同`, () => {
      expect(scenario.build(NOW)).toEqual(scenario.build(NOW))
    })
  }
})
