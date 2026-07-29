import { describe, expect, it } from 'vitest'
import { eventsToNotifications } from '@/engine/notify'
import type { EngineEvent } from '@/engine/events'
import { T0, makeAuction, makeBid, makeData, makeIdGen } from '@/engine/testFixtures'
import type { EngineData, User } from '@/types'

const users: User[] = [
  { id: 'u-staff', role: 'staff', name: '田中 健一', loginable: true, canSeeReserve: true },
  {
    id: 'd1',
    role: 'dealer',
    name: '山田 太郎',
    company: '山田商事',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: 'd2',
    role: 'dealer',
    name: '鈴木 一郎',
    company: '鈴木自動車',
    loginable: true,
    canSeeReserve: false,
  },
  {
    id: 'd3',
    role: 'dealer',
    name: '佐藤 次郎',
    company: '佐藤モータース',
    loginable: false,
    canSeeReserve: false,
  },
]

function run(events: EngineEvent[], data: EngineData = makeData()) {
  return eventsToNotifications({ events, data, users, now: T0, nextId: makeIdGen() })
}

describe('OUTBID', () => {
  it('只寄給被超越的車商', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'outbid' }])
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({
      userId: 'd1',
      type: 'OUTBID',
      auctionId: 'a1',
      read: false,
      at: T0,
    })
    expect(n[0].title).toBe('您的出價已被超越')
  })

  it('代理上限用盡時內文不同', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'proxy_exhausted' }])
    expect(n[0].body).toContain('已達您設定的代理出價上限')
  })

  it('通知內文含車輛資訊', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'outbid' }])
    expect(n[0].body).toContain('Alphard')
  })
})

describe('關注者相關', () => {
  it('STARTED 寄給關注者', () => {
    const d = makeData({ watches: [{ auctionId: 'a1', dealerId: 'd2' }] })
    const n = run([{ type: 'STARTED', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId)).toEqual(['d2'])
    expect(n[0].type).toBe('WATCHED_STARTED')
  })

  it('NEW_BID 寄給關注者但排除出價者本人', () => {
    const d = makeData({
      watches: [
        { auctionId: 'a1', dealerId: 'd1' },
        { auctionId: 'a1', dealerId: 'd2' },
      ],
    })
    const n = run([{ type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 600_000 }], d)
    expect(n.map((x) => x.userId)).toEqual(['d2'])
    expect(n[0].type).toBe('WATCHED_NEW_BID')
    expect(n[0].body).toContain('¥600,000')
  })

  it('沒有關注者時不產生通知', () => {
    const n = run([{ type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 600_000 }])
    expect(n).toEqual([])
  })
})

describe('EXTENDED 與 ENDING_SOON 寄給出價者與關注者的聯集', () => {
  it('出價者與關注者各收一份，不重複', () => {
    const d = makeData({
      bids: [
        makeBid({ dealerId: 'd1', amount: 600_000 }),
        makeBid({ dealerId: 'd2', amount: 610_000 }),
      ],
      watches: [
        { auctionId: 'a1', dealerId: 'd2' },
        { auctionId: 'a1', dealerId: 'd3' },
      ],
    })
    const n = run([{ type: 'ENDING_SOON', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId).sort()).toEqual(['d1', 'd2', 'd3'])
  })

  it('EXTENDED 內文含延長分鐘數', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run([{ type: 'EXTENDED', auctionId: 'a1', extendedMs: 180_000 }], d)
    expect(n[0].body).toContain('3 分鐘')
  })
})

describe('結標通知', () => {
  it('CLOSED_DEAL 得標者收 WON、其他出價者收 LOST、staff 收 AUCTION_CLOSED', () => {
    const d = makeData({
      bids: [
        makeBid({ dealerId: 'd1', amount: 2_000_000 }),
        makeBid({ dealerId: 'd2', amount: 1_990_000 }),
      ],
    })
    const n = run([{ type: 'CLOSED_DEAL', auctionId: 'a1', dealerId: 'd1', amount: 2_000_000 }], d)
    const byUser = Object.fromEntries(n.map((x) => [x.userId, x.type]))
    expect(byUser).toEqual({ d1: 'WON', d2: 'LOST', 'u-staff': 'AUCTION_CLOSED' })
    expect(n.find((x) => x.userId === 'd1')!.body).toContain('¥2,000,000')
  })

  it('CLOSED_PASSED 出價者收 LOST、staff 收 AUCTION_CLOSED', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run([{ type: 'CLOSED_PASSED', auctionId: 'a1', reason: '未達底價' }], d)
    const byUser = Object.fromEntries(n.map((x) => [x.userId, x.type]))
    expect(byUser).toEqual({ d1: 'LOST', 'u-staff': 'AUCTION_CLOSED' })
    expect(n.find((x) => x.userId === 'u-staff')!.body).toContain('未達底價')
  })
})

describe('議價與撤標', () => {
  it('NEGOTIATION_INVITE 只寄給被邀請者，內文含金額', () => {
    const n = run([
      { type: 'NEGOTIATION_INVITE', auctionId: 'a1', dealerId: 'd1', amount: 2_000_000 },
    ])
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ userId: 'd1', type: 'NEGOTIATION_INVITE' })
    expect(n[0].body).toContain('¥2,000,000')
  })

  it('WITHDRAWN 寄給出價者與關注者，且內文不含撤標理由', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '已撤標', withdrawReason: '借款人已清償欠款' })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
      watches: [{ auctionId: 'a1', dealerId: 'd2' }],
    })
    const n = run([{ type: 'WITHDRAWN', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId).sort()).toEqual(['d1', 'd2'])
    expect(n.every((x) => !x.body.includes('清償'))).toBe(true)
    expect(n[0].body).toContain('已下架')
  })
})

describe('內部通知', () => {
  it('NO_BID_ALERT 只寄給 staff', () => {
    const n = run([{ type: 'NO_BID_ALERT', auctionId: 'a1' }])
    expect(n.map((x) => x.userId)).toEqual(['u-staff'])
  })

  it('ENDING_BELOW_RESERVE 只寄給 staff，內文含差額', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 1_500_000 })] })
    const n = run([{ type: 'ENDING_BELOW_RESERVE', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId)).toEqual(['u-staff'])
    expect(n[0].body).toContain('¥500,000')
  })
})

describe('id 與容錯', () => {
  it('id 來自 nextId，每則不同', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run(
      [
        { type: 'ENDING_SOON', auctionId: 'a1' },
        { type: 'NO_BID_ALERT', auctionId: 'a1' },
      ],
      d,
    )
    expect(new Set(n.map((x) => x.id)).size).toBe(n.length)
  })

  it('找不到拍賣的事件被略過而非拋錯', () => {
    const n = run([{ type: 'ENDING_SOON', auctionId: 'nope' }])
    expect(n).toEqual([])
  })
})
