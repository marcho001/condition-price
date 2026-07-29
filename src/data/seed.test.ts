import { describe, expect, it } from 'vitest'
import { advanceAuctions } from '@/engine/advance'
import { buildSeed } from '@/data/seed'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { ALL_DEALER_IDS, STAFF_ID } from '@/data/users'
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

function countByStatus(statuses: AuctionStatus[]) {
  return statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
}

describe('buildSeed 資料組成', () => {
  it('產生 26 台車輛：14 台綁定拍賣、12 台純在庫', () => {
    const { data } = buildSeed(NOW)
    expect(data.vehicles).toHaveLength(26)

    const bound = new Set(data.auctions.map((a) => a.vehicleId))
    expect(data.vehicles.filter((v) => !bound.has(v.id))).toHaveLength(12)
  })

  it('可排拍的車輛 = 12 台純在庫 + 2 台流標退回', () => {
    const { data } = buildSeed(NOW)
    // 流標的拍賣會把車輛退回「在庫」，所以可排拍的比純在庫多 2 台
    expect(data.vehicles.filter((v) => v.status === '在庫')).toHaveLength(14)
  })

  it('產生 14 筆拍賣，狀態分布符合規格', () => {
    const { data } = buildSeed(NOW)
    expect(data.auctions).toHaveLength(14)
    expect(countByStatus(data.auctions.map((a) => a.status))).toEqual({
      未開始: 3,
      進行中: 5,
      議價中: 2,
      已流標: 2,
      已成交: 2,
    })
  })

  it('三種拍賣方式都出現在進行中的拍賣裡', () => {
    const { data } = buildSeed(NOW)
    const running = data.auctions.filter((a) => a.status === '進行中')
    expect(new Set(running.map((a) => a.type))).toEqual(
      new Set(['SCHEDULED', 'LIVE', 'SEALED']),
    )
  })

  it('每筆拍賣都對應一台存在的車輛，且無重複綁定', () => {
    const { data } = buildSeed(NOW)
    const ids = data.auctions.map((a) => a.vehicleId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(data.vehicles.some((v) => v.id === id)).toBe(true)
    }
  })

  it('車輛狀態與拍賣狀態一致', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions) {
      const v = data.vehicles.find((x) => x.id === a.vehicleId)!
      expect(v.status).toBe(VEHICLE_STATUS_FOR[a.status])
    }
  })

  it('廠牌都來自車款清單', () => {
    const { data } = buildSeed(NOW)
    for (const v of data.vehicles) {
      expect(ALL_BRANDS).toContain(v.brand)
    }
  })

  it('每台車有 6 張照片 seed', () => {
    const { data } = buildSeed(NOW)
    for (const v of data.vehicles) {
      expect(v.photoSeeds).toHaveLength(6)
    }
  })

  it('底價不低於起標價', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions) {
      expect(a.reservePrice).toBeGreaterThanOrEqual(a.startPrice)
    }
  })

  it('出價都來自已知車商，且不低於起標價', () => {
    const { data } = buildSeed(NOW)
    for (const b of data.bids) {
      expect(ALL_DEALER_IDS).toContain(b.dealerId)
      const a = data.auctions.find((x) => x.id === b.auctionId)!
      expect(b.amount).toBeGreaterThanOrEqual(a.startPrice)
    }
  })

  it('originalEndAt 與 extendedMs 一致', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions) {
      expect(a.endAt - a.originalEndAt).toBe(a.extendedMs)
    }
  })
})

describe('buildSeed 示範用的關鍵情境', () => {
  it('有一筆即將結標（10 分鐘內）且有多筆出價的拍賣', () => {
    const { data } = buildSeed(NOW)
    const soon = data.auctions.find(
      (a) => a.status === '進行中' && a.endAt - NOW > 0 && a.endAt - NOW <= 600_000,
    )
    expect(soon).toBeDefined()
    expect(data.bids.filter((b) => b.auctionId === soon!.id).length).toBeGreaterThanOrEqual(5)
  })

  it('有一筆已延長的拍賣', () => {
    const { data } = buildSeed(NOW)
    expect(data.auctions.some((a) => a.extendedMs > 0)).toBe(true)
  })

  it('議價中的拍賣，最高出價低於底價但差距小於 10%', () => {
    const { data } = buildSeed(NOW)
    const negotiating = data.auctions.filter((a) => a.status === '議價中')
    expect(negotiating).toHaveLength(2)
    for (const a of negotiating) {
      expect(a.negotiation).toBeDefined()
      expect(a.negotiation!.deadline).toBeGreaterThan(NOW)
      const top = Math.max(...data.bids.filter((b) => b.auctionId === a.id).map((b) => b.amount))
      expect(top).toBeLessThan(a.reservePrice)
      expect((a.reservePrice - top) / a.reservePrice).toBeLessThan(0.1)
    }
  })

  it('密封投標在結標前有多家投標，且每家只投一次', () => {
    const { data } = buildSeed(NOW)
    const sealed = data.auctions.find((a) => a.type === 'SEALED' && a.status === '進行中')!
    const bids = data.bids.filter((b) => b.auctionId === sealed.id)
    expect(bids.length).toBeGreaterThanOrEqual(3)
    expect(new Set(bids.map((b) => b.dealerId)).size).toBe(bids.length)
  })

  it('有預設的關注與代理出價', () => {
    const { data } = buildSeed(NOW)
    expect(data.watches.length).toBeGreaterThanOrEqual(3)
    expect(data.proxies.length).toBeGreaterThanOrEqual(3)
  })

  it('已成交的拍賣有 deal，已流標的有 closeReason', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions.filter((x) => x.status === '已成交')) {
      expect(a.deal).toBeDefined()
    }
    for (const a of data.auctions.filter((x) => x.status === '已流標')) {
      expect(a.closeReason).toBeDefined()
    }
  })
})

describe('buildSeed 與引擎的相容性', () => {
  it('剛產生的資料立刻跑一次引擎不會噴出任何事件', () => {
    const { data } = buildSeed(NOW)
    let n = 0
    const r = advanceAuctions(data, NOW, () => `x${++n}`)
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })

  it('往前快轉 1 小時後即將結標的拍賣會結束', () => {
    const { data } = buildSeed(NOW)
    let n = 0
    const r = advanceAuctions(data, NOW + 3_600_000, () => `x${++n}`)
    expect(r.changed).toBe(true)
    expect(r.events.some((e) => e.type === 'CLOSED_DEAL' || e.type === 'CLOSED_PASSED')).toBe(true)
  })
})

describe('buildSeed 的初始通知', () => {
  it('產生歷史通知，時間都在 now 之前', () => {
    const { notifications } = buildSeed(NOW)
    expect(notifications.length).toBeGreaterThanOrEqual(6)
    for (const n of notifications) {
      expect(n.at).toBeLessThan(NOW)
    }
  })

  it('通知的收件者都是已知使用者', () => {
    const { notifications } = buildSeed(NOW)
    const known = new Set([STAFF_ID, ...ALL_DEALER_IDS])
    for (const n of notifications) {
      expect(known.has(n.userId)).toBe(true)
    }
  })

  it('至少有一則未讀的 OUTBID 給可登入的車商', () => {
    const { notifications } = buildSeed(NOW)
    expect(notifications.some((n) => n.type === 'OUTBID' && !n.read)).toBe(true)
  })

  it('通知的 auctionId 都指向存在的拍賣', () => {
    const { data, notifications } = buildSeed(NOW)
    for (const n of notifications) {
      expect(data.auctions.some((a) => a.id === n.auctionId)).toBe(true)
    }
  })
})

describe('buildSeed 決定性', () => {
  it('同一個 now 呼叫兩次得到完全相同的資料', () => {
    expect(buildSeed(NOW)).toEqual(buildSeed(NOW))
  })
})
