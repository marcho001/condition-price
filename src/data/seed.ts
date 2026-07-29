import { faker } from '@faker-js/faker'
import {
  BELOW_RESERVE_LEAD_MS,
  ENDING_SOON_LEAD_MS,
  NO_BID_ALERT_MS,
} from '@/engine/rules'
import { bidStepFor } from '@/lib/money'
import {
  CATALOG,
  COLORS,
  PLATE_KANA,
  PLATE_REGIONS,
  REMARK_POOL,
  estimateMarketPrice,
  type ModelSpec,
} from '@/data/vehicleCatalog'
import { ALL_DEALER_IDS, DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import type {
  AppNotification,
  Auction,
  AuctionStatus,
  AuctionType,
  Bid,
  EngineData,
  Grade,
  InteriorGrade,
  ProxyBid,
  StepMode,
  Vehicle,
  Watch,
} from '@/types'

const SEED = 20260728
const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

const GRADES: Grade[] = ['S', '5', '4.5', '4', '3.5', '3', '2', 'R']
const INTERIOR: InteriorGrade[] = ['A', 'B', 'C', 'D']

const VEHICLE_STATUS_FOR: Record<AuctionStatus, Vehicle['status']> = {
  未開始: '已排拍',
  進行中: '拍賣中',
  議價中: '拍賣中',
  已成交: '已售出',
  已流標: '在庫',
  已撤標: '已下架',
}

/** 由這張表決定 14 筆拍賣長什麼樣，避免邏輯散落 */
type Blueprint = {
  key: string
  type: AuctionType
  status: AuctionStatus
  /** 相對於 now 的開始時間 */
  startOffset: number
  /** 相對於 now 的結標時間 */
  endOffset: number
  /** 出價筆數（密封標為投標家數） */
  bidCount: number
  /** 最高出價相對底價的比例。1 以上表示達到底價 */
  topRatio: number
  extendedMs?: number
  buyNowRatio?: number
  stepMode?: StepMode
  fixedStep?: number
}

const BLUEPRINTS: Blueprint[] = [
  // 未開始 3 筆
  { key: 'up-scheduled', type: 'SCHEDULED', status: '未開始', startOffset: 2 * HOUR, endOffset: 2 * HOUR + 4 * DAY, bidCount: 0, topRatio: 0 },
  { key: 'up-live', type: 'LIVE', status: '未開始', startOffset: 30 * MIN, endOffset: 30 * MIN + 90_000, bidCount: 0, topRatio: 0 },
  { key: 'up-sealed', type: 'SEALED', status: '未開始', startOffset: DAY, endOffset: 3 * DAY, bidCount: 0, topRatio: 0, buyNowRatio: 1.18 },

  // 進行中 5 筆
  { key: 'run-normal', type: 'SCHEDULED', status: '進行中', startOffset: -DAY, endOffset: 2 * DAY, bidCount: 5, topRatio: 0.72 },
  { key: 'run-ending-soon', type: 'SCHEDULED', status: '進行中', startOffset: -3 * DAY, endOffset: 8 * MIN, bidCount: 8, topRatio: 0.94 },
  { key: 'run-extended', type: 'SCHEDULED', status: '進行中', startOffset: -4 * DAY, endOffset: 4 * MIN, bidCount: 7, topRatio: 1.04, extendedMs: 9 * MIN },
  { key: 'run-live', type: 'LIVE', status: '進行中', startOffset: -60_000, endOffset: 60_000, bidCount: 3, topRatio: 0.68 },
  { key: 'run-sealed', type: 'SEALED', status: '進行中', startOffset: -DAY, endOffset: 2 * DAY, bidCount: 3, topRatio: 0.88, buyNowRatio: 1.15 },

  // 議價中 2 筆
  { key: 'nego-a', type: 'SCHEDULED', status: '議價中', startOffset: -5 * DAY, endOffset: -4 * HOUR, bidCount: 6, topRatio: 0.94 },
  { key: 'nego-b', type: 'SEALED', status: '議價中', startOffset: -6 * DAY, endOffset: -20 * HOUR, bidCount: 4, topRatio: 0.92 },

  // 已流標 2 筆
  { key: 'passed-nobid', type: 'SCHEDULED', status: '已流標', startOffset: -9 * DAY, endOffset: -2 * DAY, bidCount: 0, topRatio: 0 },
  { key: 'passed-low', type: 'SCHEDULED', status: '已流標', startOffset: -10 * DAY, endOffset: -3 * DAY, bidCount: 4, topRatio: 0.78 },

  // 已成交 2 筆
  { key: 'deal-a', type: 'SCHEDULED', status: '已成交', startOffset: -12 * DAY, endOffset: -5 * DAY, bidCount: 9, topRatio: 1.09 },
  { key: 'deal-b', type: 'SEALED', status: '已成交', startOffset: -14 * DAY, endOffset: -7 * DAY, bidCount: 5, topRatio: 1.02, stepMode: 'fixed', fixedStep: 20_000 },
]

const IN_STOCK_COUNT = 12

export function buildSeed(now: number): {
  data: EngineData
  notifications: AppNotification[]
} {
  faker.seed(SEED)

  const currentYear = new Date(now).getFullYear()
  let vehicleSeq = 0
  let orderSeq = 140
  let bidSeq = 0
  let notifySeq = 0

  const flatModels = CATALOG.flatMap((c) => c.models.map((m) => ({ brand: c.brand, spec: m })))

  function makeVehicle(status: Vehicle['status'], createdAt: number) {
    const pick = flatModels[vehicleSeq % flatModels.length]
    const spec: ModelSpec = pick.spec
    const year = faker.number.int({ min: spec.yearRange[0], max: spec.yearRange[1] })
    const id = `v${String(++vehicleSeq).padStart(3, '0')}`
    const market = estimateMarketPrice(spec, year, currentYear)

    const vehicle: Vehicle = {
      id,
      orderNo: `ORD-2026-${String(++orderSeq).padStart(4, '0')}`,
      brand: pick.brand,
      model: spec.model,
      year,
      mileage: faker.number.int({ min: 12, max: 148 }) * 1_000,
      plate: `${faker.helpers.arrayElement(PLATE_REGIONS)} ${faker.number.int({
        min: 300,
        max: 599,
      })} ${faker.helpers.arrayElement(PLATE_KANA)} ${faker.number.int({
        min: 10,
        max: 99,
      })}-${faker.number.int({ min: 10, max: 99 })}`,
      vin: faker.vehicle.vin(),
      displacement: spec.displacement,
      fuel: spec.fuel,
      transmission: spec.transmission,
      drive: spec.drive,
      color: faker.helpers.arrayElement(COLORS),
      seats: spec.seats,
      bodyType: spec.bodyType,
      grade: faker.helpers.arrayElement(GRADES),
      interiorGrade: faker.helpers.arrayElement(INTERIOR),
      photoSeeds: Array.from({ length: 6 }, () => faker.number.int({ min: 1, max: 99_999 })),
      remarks: faker.helpers.arrayElements(REMARK_POOL, { min: 2, max: 3 }).join(' '),
      loanBalance:
        Math.round((market * faker.number.float({ min: 0.72, max: 1.24 })) / 10_000) * 10_000,
      status,
      createdAt,
    }
    return { vehicle, market }
  }

  const vehicles: Vehicle[] = []
  const auctions: Auction[] = []
  const bids: Bid[] = []
  const proxies: ProxyBid[] = []
  const watches: Watch[] = []
  const notifications: AppNotification[] = []

  for (const bp of BLUEPRINTS) {
    const createdAt = now + bp.startOffset - DAY
    const { vehicle, market } = makeVehicle(VEHICLE_STATUS_FOR[bp.status], createdAt)
    vehicles.push(vehicle)

    const reservePrice = Math.round((market * 0.82) / 10_000) * 10_000
    const startPrice = Math.round((reservePrice * 0.6) / 10_000) * 10_000
    const stepMode: StepMode = bp.stepMode ?? 'auto'
    const endAt = now + bp.endOffset

    const auction: Auction = {
      id: `a-${bp.key}`,
      vehicleId: vehicle.id,
      type: bp.type,
      status: bp.status,
      startAt: now + bp.startOffset,
      endAt,
      originalEndAt: endAt - (bp.extendedMs ?? 0),
      startPrice,
      reservePrice,
      stepMode,
      fixedStep: bp.fixedStep,
      buyNowPrice: bp.buyNowRatio
        ? Math.round((reservePrice * bp.buyNowRatio) / 10_000) * 10_000
        : undefined,
      extendedMs: bp.extendedMs ?? 0,
      emittedKeys: [],
      createdAt,
    }

    // 出價：從起標價往上疊到 topRatio × 底價
    if (bp.bidCount > 0) {
      const target = Math.round((reservePrice * bp.topRatio) / 10_000) * 10_000
      const span = Math.max(0, bp.endOffset - bp.startOffset)

      if (bp.type === 'SEALED') {
        // 密封標：每家一筆，金額彼此獨立，最高者等於 target
        const dealers = faker.helpers.arrayElements(ALL_DEALER_IDS, bp.bidCount)
        dealers.forEach((dealerId, i) => {
          const amount =
            i === 0
              ? target
              : Math.round((target * faker.number.float({ min: 0.7, max: 0.97 })) / 10_000) *
                10_000
          bids.push({
            id: `b${String(++bidSeq).padStart(4, '0')}`,
            auctionId: auction.id,
            dealerId,
            amount: Math.max(startPrice, amount),
            at: auction.startAt + Math.round(span * faker.number.float({ min: 0.1, max: 0.8 })),
            kind: 'manual',
          })
        })
      } else {
        // 公開競價：階梯式往上，交錯不同車商，最後一筆為 target
        const ladder: number[] = []
        let price = startPrice
        for (let i = 0; i < bp.bidCount - 1; i++) {
          ladder.push(price)
          price += bidStepFor(price, stepMode, bp.fixedStep)
        }
        ladder.push(Math.max(target, price))

        const pool = faker.helpers.arrayElements(ALL_DEALER_IDS, Math.min(4, ALL_DEALER_IDS.length))
        ladder.forEach((amount, i) => {
          bids.push({
            id: `b${String(++bidSeq).padStart(4, '0')}`,
            auctionId: auction.id,
            dealerId: pool[i % pool.length],
            amount,
            at: auction.startAt + Math.round((span * (i + 1)) / (ladder.length + 1)),
            kind: i > 0 && i % 3 === 0 ? 'proxy' : 'manual',
          })
        })
      }
    }

    const topBid = bids
      .filter((b) => b.auctionId === auction.id)
      .reduce<Bid | null>((best, b) => (!best || b.amount > best.amount ? b : best), null)

    if (bp.status === '已成交' && topBid) {
      auction.deal = { dealerId: topBid.dealerId, amount: topBid.amount, at: auction.endAt }
    }
    if (bp.status === '已流標') {
      auction.closeReason = bp.bidCount === 0 ? '無人出價' : '未達底價'
    }
    if (bp.status === '議價中' && topBid) {
      auction.negotiation = {
        dealerId: topBid.dealerId,
        amount: reservePrice,
        deadline: now + (bp.key === 'nego-a' ? 20 * HOUR : 4 * HOUR),
        declinedDealerIds: [],
      }
    }

    prefillEmittedKeys(auction, now, topBid?.amount ?? null)
    auctions.push(auction)
  }

  // 在庫車輛
  for (let i = 0; i < IN_STOCK_COUNT; i++) {
    const { vehicle } = makeVehicle('在庫', now - faker.number.int({ min: 1, max: 20 }) * DAY)
    vehicles.push(vehicle)
  }

  // 關注：山田 3 筆、鈴木 2 筆
  const watchable = auctions.filter((a) => a.status === '進行中' || a.status === '未開始')
  faker.helpers.arrayElements(watchable, 3).forEach((a) => {
    watches.push({ auctionId: a.id, dealerId: DEALER_A_ID })
  })
  faker.helpers.arrayElements(watchable, 2).forEach((a) => {
    watches.push({ auctionId: a.id, dealerId: DEALER_B_ID })
  })

  // 代理出價：3 筆，掛在進行中的公開競價上
  const proxyTargets = auctions
    .filter((a) => a.status === '進行中' && a.type !== 'SEALED')
    .slice(0, 3)
  proxyTargets.forEach((a, i) => {
    const dealerId = [DEALER_A_ID, DEALER_B_ID, 'd-sato'][i]
    proxies.push({
      auctionId: a.id,
      dealerId,
      maxAmount: Math.round((a.reservePrice * 1.06) / 10_000) * 10_000,
      active: true,
      createdAt: a.startAt + HOUR,
    })
  })

  // 歷史通知
  const pushNotification = (
    userId: string,
    type: AppNotification['type'],
    auctionId: string,
    title: string,
    body: string,
    minutesAgo: number,
    read = false,
  ) => {
    notifications.push({
      id: `n${String(++notifySeq).padStart(3, '0')}`,
      userId,
      type,
      auctionId,
      title,
      body,
      at: now - minutesAgo * MIN,
      read,
    })
  }

  const byId = (id: string) => auctions.find((a) => a.id === id)!
  const soon = byId('a-run-ending-soon')
  const extended = byId('a-run-extended')
  const negoA = byId('a-nego-a')
  const dealA = byId('a-deal-a')
  const nobid = byId('a-passed-nobid')
  const label = (a: Auction) => {
    const v = vehicles.find((x) => x.id === a.vehicleId)!
    return `${v.brand} ${v.model} ${v.year}`
  }

  pushNotification(DEALER_A_ID, 'OUTBID', soon.id, '您的出價已被超越', `${label(soon)} 已有更高出價。`, 12)
  pushNotification(DEALER_A_ID, 'ENDING_SOON', soon.id, '拍賣即將結標', `${label(soon)} 即將結標，請確認您的出價。`, 4)
  pushNotification(DEALER_A_ID, 'EXTENDED', extended.id, '結標時間已延長', `${label(extended)} 因結標前有新出價，結標時間延長 3 分鐘。`, 6)
  pushNotification(DEALER_B_ID, 'WATCHED_NEW_BID', soon.id, '關注的拍賣有新出價', `${label(soon)} 出現新出價。`, 18, true)
  pushNotification(
    negoA.negotiation!.dealerId,
    'NEGOTIATION_INVITE',
    negoA.id,
    '議價邀請',
    `${label(negoA)} 您的出價未達底價，加價後即可成交，請於 24 小時內決定。`,
    240,
  )
  pushNotification(DEALER_A_ID, 'WON', dealA.id, '恭喜得標', `您已得標 ${label(dealA)}。`, 5 * 24 * 60, true)
  pushNotification(STAFF_ID, 'NO_BID_ALERT', nobid.id, '上架 2 天無人出價', `${label(nobid)} 已上架 2 天仍無人出價。`, 3 * 24 * 60, true)
  pushNotification(STAFF_ID, 'ENDING_BELOW_RESERVE', soon.id, '即將結標未達底價', `${label(soon)} 即將結標，目前最高價仍未達底價。`, 30)

  return { data: { vehicles, auctions, bids, proxies, watches }, notifications }
}

/**
 * 把「按時間算已經該發生」的事件鍵預先填入，讓第一次 advance 不產生任何事件。
 * 鍵的格式必須與 advanceAuctions 完全一致，否則開站會被通知轟炸。
 */
function prefillEmittedKeys(auction: Auction, now: number, topAmount: number | null): void {
  const keys: string[] = []
  if (now >= auction.startAt) keys.push('STARTED')

  if (auction.status === '進行中') {
    if (now >= auction.endAt - ENDING_SOON_LEAD_MS) keys.push(`ENDING_SOON:${auction.endAt}`)
    if (now >= auction.endAt - BELOW_RESERVE_LEAD_MS && (topAmount ?? 0) < auction.reservePrice) {
      keys.push(`BELOW_RESERVE:${auction.endAt}`)
    }
    if (topAmount === null && now - auction.startAt >= NO_BID_ALERT_MS) keys.push('NO_BID')
  }
  auction.emittedKeys = keys
}
