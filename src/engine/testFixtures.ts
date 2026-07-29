import type { Auction, Bid, EngineData, ProxyBid, Vehicle } from '@/types'

export const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

export function makeVehicle(over: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    orderNo: 'ORD-2026-0001',
    brand: 'Toyota',
    model: 'Alphard',
    year: 2019,
    mileage: 62_000,
    plate: '品川 330 あ 12-34',
    vin: 'JT1234567890ABCDE',
    displacement: 2493,
    fuel: '汽油',
    transmission: 'CVT',
    drive: 'FF',
    color: '珍珠白',
    seats: 7,
    bodyType: '七人車',
    grade: '4.5',
    interiorGrade: 'B',
    photoSeeds: [1, 2, 3],
    remarks: '',
    loanBalance: 1_500_000,
    status: '拍賣中',
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

/**
 * `originalEndAt` 預設跟著 `endAt` 走（減掉 extendedMs），
 * 這樣只覆寫 endAt 時 fixture 不會自我矛盾。
 */
export function makeAuction(over: Partial<Auction> = {}): Auction {
  const endAt = over.endAt ?? T0 + 86_400_000
  const extendedMs = over.extendedMs ?? 0
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    startPrice: 500_000,
    reservePrice: 2_000_000,
    stepMode: 'auto',
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
    endAt,
    extendedMs,
    originalEndAt: over.originalEndAt ?? endAt - extendedMs,
  }
}

export function makeBid(over: Partial<Bid> & { dealerId: string; amount: number }): Bid {
  return {
    id: `b-${over.dealerId}-${over.amount}`,
    auctionId: 'a1',
    at: T0,
    kind: 'manual',
    ...over,
  }
}

export function makeProxy(
  over: Partial<ProxyBid> & { dealerId: string; maxAmount: number },
): ProxyBid {
  return { auctionId: 'a1', active: true, createdAt: T0, ...over }
}

export function makeData(over: Partial<EngineData> = {}): EngineData {
  return {
    vehicles: [makeVehicle()],
    auctions: [makeAuction()],
    bids: [],
    proxies: [],
    watches: [],
    ...over,
  }
}

export function makeIdGen(): () => string {
  let n = 0
  return () => `n${++n}`
}
