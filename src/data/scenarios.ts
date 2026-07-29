import { buildSeed } from '@/data/seed'
import { ALL_DEALER_IDS, DEALER_A_ID, DEALER_B_ID } from '@/data/users'
import { placeBid } from '@/engine/bid'
import { bidStepFor } from '@/lib/money'
import type { AppNotification, Auction, Bid, EngineData } from '@/types'

export type Scenario = {
  key: string
  label: string
  description: string
  build: (now: number) => { data: EngineData; notifications: AppNotification[] }
}

const MIN = 60_000
const HOUR = 3_600_000

function replaceAuction(data: EngineData, next: Auction): EngineData {
  return { ...data, auctions: data.auctions.map((a) => (a.id === next.id ? next : a)) }
}

/** 清掉某筆拍賣的所有出價，重新鋪一條指定的階梯 */
function relayBids(
  data: EngineData,
  auctionId: string,
  ladder: Array<{ dealerId: string; amount: number; at: number; kind?: Bid['kind'] }>,
): EngineData {
  const others = data.bids.filter((b) => b.auctionId !== auctionId)
  const fresh: Bid[] = ladder.map((x, i) => ({
    id: `sc-${auctionId}-${i}`,
    auctionId,
    dealerId: x.dealerId,
    amount: x.amount,
    at: x.at,
    kind: x.kind ?? 'manual',
  }))
  return { ...data, bids: [...others, ...fresh] }
}

/** 從起標價往上疊 count 級，交錯指定的車商 */
function ladderFrom(
  auction: Auction,
  count: number,
  dealers: string[],
  startAt: number,
  spacingMs: number,
) {
  const out: Array<{ dealerId: string; amount: number; at: number }> = []
  let price = auction.startPrice
  for (let i = 0; i < count; i++) {
    out.push({ dealerId: dealers[i % dealers.length], amount: price, at: startAt + i * spacingMs })
    price += bidStepFor(price, auction.stepMode, auction.fixedStep)
  }
  return out
}

/**
 * 重新指派提醒類事件的去重鍵。
 * 改了 endAt 就必須同步這些鍵，否則載入情境後會立刻噴一堆通知。
 */
function emittedFor(auction: Auction, now: number, topAmount: number | null): string[] {
  const keys = ['STARTED']
  if (auction.status === '進行中') {
    if (now >= auction.endAt - 600_000) keys.push(`ENDING_SOON:${auction.endAt}`)
    if (now >= auction.endAt - HOUR && (topAmount ?? 0) < auction.reservePrice) {
      keys.push(`BELOW_RESERVE:${auction.endAt}`)
    }
  }
  return keys
}

function note(
  userId: string,
  type: AppNotification['type'],
  auctionId: string,
  title: string,
  body: string,
  at: number,
): AppNotification {
  return {
    id: `sc-n-${userId}-${type}-${auctionId}`,
    userId,
    type,
    auctionId,
    title,
    body,
    at,
    read: false,
  }
}

const TARGET = 'a-run-normal'
const SEALED_TARGET = 'a-run-sealed'

export const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    key: 'ending-soon',
    label: '即將結標的熱門車',
    description: '剩 2 分鐘、已有 8 次出價、山田商事目前領先',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === TARGET)!

      // 最後一筆由山田出價，因此他領先
      const dealers = [
        DEALER_B_ID,
        'd-sato',
        DEALER_A_ID,
        'd-ito',
        DEALER_B_ID,
        'd-sato',
        'd-ito',
        DEALER_A_ID,
      ]
      const ladder = ladderFrom(base, 8, dealers, now - 6 * HOUR, 40 * MIN)
      data = relayBids(data, base.id, ladder)

      const endAt = now + 2 * MIN
      const top = ladder[ladder.length - 1].amount
      const next: Auction = { ...base, endAt, originalEndAt: endAt, extendedMs: 0 }
      data = replaceAuction(data, { ...next, emittedKeys: emittedFor(next, now, top) })

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'ENDING_SOON',
            base.id,
            '拍賣即將結標',
            '您領先的拍賣即將結標。',
            now - 30_000,
          ),
        ],
      }
    },
  },

  {
    key: 'outbid',
    label: '你被超越了',
    description: '山田商事剛被鈴鐺自動車超越，通知已在鈴鐺裡',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === TARGET)!

      // 山田先出，鈴鐺最後出
      const ladder = ladderFrom(
        base,
        4,
        [DEALER_A_ID, 'd-sato', DEALER_A_ID, DEALER_B_ID],
        now - 3 * HOUR,
        30 * MIN,
      )
      data = relayBids(data, base.id, ladder)

      const endAt = now + 6 * HOUR
      const next: Auction = { ...base, endAt, originalEndAt: endAt }
      data = replaceAuction(data, {
        ...next,
        emittedKeys: emittedFor(next, now, ladder[ladder.length - 1].amount),
      })

      // 山田的代理若還在會立刻反超，與情境衝突
      data = { ...data, proxies: data.proxies.filter((p) => p.auctionId !== base.id) }

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'OUTBID',
            base.id,
            '您的出價已被超越',
            '這筆拍賣已有更高出價，請確認是否加價。',
            now - 20_000,
          ),
        ],
      }
    },
  },

  {
    key: 'extended',
    label: '軟結標延長中',
    description: '已延長 3 次共 9 分鐘，倒數旁顯示延長標記',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === TARGET)!

      const ladder = ladderFrom(
        base,
        5,
        [DEALER_B_ID, DEALER_A_ID, 'd-sato', DEALER_B_ID, DEALER_A_ID],
        now - 2 * HOUR,
        20 * MIN,
      )
      data = relayBids(data, base.id, ladder)

      const endAt = now + 90_000
      const next: Auction = {
        ...base,
        endAt,
        originalEndAt: endAt - 9 * MIN,
        extendedMs: 9 * MIN,
      }
      data = replaceAuction(data, {
        ...next,
        emittedKeys: emittedFor(next, now, ladder[ladder.length - 1].amount),
      })

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'EXTENDED',
            base.id,
            '結標時間已延長',
            '因結標前有新出價，結標時間延長 3 分鐘。',
            now - 60_000,
          ),
        ],
      }
    },
  },

  {
    key: 'negotiating',
    label: '議價中',
    description: '山田商事的出價未達底價，收到議價邀請',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === TARGET)!

      // 最高價設在底價的 94%（落在 10% 議價門檻內），由山田持有
      const top = Math.round((base.reservePrice * 0.94) / 10_000) * 10_000
      const step = bidStepFor(top, base.stepMode, base.fixedStep)
      data = relayBids(data, base.id, [
        { dealerId: DEALER_B_ID, amount: top - step * 2, at: now - 5 * HOUR },
        { dealerId: 'd-sato', amount: top - step, at: now - 4 * HOUR },
        { dealerId: DEALER_A_ID, amount: top, at: now - 3 * HOUR },
      ])

      data = replaceAuction(data, {
        ...base,
        status: '議價中',
        endAt: now - 2 * HOUR,
        originalEndAt: now - 2 * HOUR,
        emittedKeys: ['STARTED'],
        negotiation: {
          dealerId: DEALER_A_ID,
          amount: base.reservePrice,
          deadline: now + 20 * HOUR,
          declinedDealerIds: [],
        },
      })

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'NEGOTIATION_INVITE',
            base.id,
            '議價邀請',
            '您的出價未達底價，加價後即可成交，請於 24 小時內決定。',
            now - 2 * HOUR,
          ),
        ],
      }
    },
  },

  {
    key: 'sealed',
    label: '密封投標開標前',
    description: '3 家已投標、金額全部隱藏，山田商事尚未投標',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === SEALED_TARGET)!

      const others = ALL_DEALER_IDS.filter((d) => d !== DEALER_A_ID).slice(0, 3)
      const step = bidStepFor(base.startPrice, base.stepMode, base.fixedStep)
      data = relayBids(
        data,
        base.id,
        others.map((dealerId, i) => ({
          dealerId,
          amount: base.startPrice + step * (i + 1) * 3,
          at: now - (i + 1) * HOUR,
        })),
      )

      const endAt = now + 12 * HOUR
      const next: Auction = { ...base, endAt, originalEndAt: endAt }
      data = replaceAuction(data, { ...next, emittedKeys: emittedFor(next, now, null) })

      return { data, notifications: seed.notifications }
    },
  },

  {
    key: 'proxy-war',
    label: '代理出價互頂',
    description: '兩家車商都設了代理，價格自動被推到其中一方上限',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === TARGET)!

      data = relayBids(data, base.id, [])
      const endAt = now + 8 * HOUR
      const withTime: Auction = {
        ...base,
        endAt,
        originalEndAt: endAt,
        extendedMs: 0,
        emittedKeys: ['STARTED'],
      }
      data = replaceAuction(data, withTime)

      const step = bidStepFor(base.startPrice, base.stepMode, base.fixedStep)
      data = {
        ...data,
        proxies: [
          ...data.proxies.filter((p) => p.auctionId !== base.id),
          {
            auctionId: base.id,
            dealerId: DEALER_B_ID,
            maxAmount: base.startPrice + step * 12,
            active: true,
            createdAt: now - 2 * HOUR,
          },
          {
            auctionId: base.id,
            dealerId: 'd-sato',
            maxAmount: base.startPrice + step * 20,
            active: true,
            createdAt: now - HOUR,
          },
        ],
      }

      // 讓引擎真的跑一次互頂，結果才與規則一致
      let seq = 0
      const placed = placeBid(data, {
        auctionId: base.id,
        dealerId: DEALER_A_ID,
        amount: base.startPrice,
        now: now - 30 * MIN,
        nextId: () => `sc-pw-${++seq}`,
      })
      data = placed.data

      // placeBid 可能觸發軟結標延長，重新對齊事件鍵
      const after = data.auctions.find((a) => a.id === base.id)!
      data = replaceAuction(data, { ...after, emittedKeys: emittedFor(after, now, null) })

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'OUTBID',
            base.id,
            '您的出價已被超越',
            '對方設有代理出價，價格已被自動推高。',
            now - 29 * MIN,
          ),
        ],
      }
    },
  },
]
