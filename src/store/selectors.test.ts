import { describe, expect, it } from 'vitest'
import { anonCodesFor, filterAuctions, filterVehicles } from '@/store/selectors'
import { makeAuction, makeBid, makeVehicle } from '@/engine/testFixtures'

describe('anonCodesFor', () => {
  it('依首次出價順序指派 A、B、C', () => {
    const bids = [
      makeBid({ dealerId: 'd3', amount: 100, at: 1 }),
      makeBid({ dealerId: 'd1', amount: 200, at: 2 }),
      makeBid({ dealerId: 'd3', amount: 300, at: 3 }),
      makeBid({ dealerId: 'd2', amount: 400, at: 4 }),
    ]
    const codes = anonCodesFor(bids)
    expect(codes.get('d3')).toBe('出價者 A')
    expect(codes.get('d1')).toBe('出價者 B')
    expect(codes.get('d2')).toBe('出價者 C')
  })

  it('出價陣列順序不影響結果，只看時間', () => {
    const bids = [
      makeBid({ dealerId: 'd2', amount: 400, at: 9 }),
      makeBid({ dealerId: 'd1', amount: 100, at: 1 }),
    ]
    expect(anonCodesFor(bids).get('d1')).toBe('出價者 A')
  })

  it('沒有出價時回傳空 Map', () => {
    expect(anonCodesFor([]).size).toBe(0)
  })
})

describe('filterVehicles', () => {
  const vehicles = [
    makeVehicle({ id: 'v1', brand: 'Toyota', model: 'Alphard', year: 2019, orderNo: 'ORD-2026-0141', status: '在庫' }),
    makeVehicle({ id: 'v2', brand: 'Honda', model: 'N-BOX', year: 2021, orderNo: 'ORD-2026-0142', status: '在庫' }),
    makeVehicle({ id: 'v3', brand: 'Toyota', model: 'Prius', year: 2016, orderNo: 'ORD-2026-0143', status: '已售出' }),
  ]

  it('無條件時全部回傳', () => {
    expect(filterVehicles(vehicles, {})).toHaveLength(3)
  })
  it('依廠牌篩選（多選）', () => {
    expect(filterVehicles(vehicles, { brands: ['Toyota'] }).map((v) => v.id)).toEqual(['v1', 'v3'])
  })
  it('依年份區間篩選', () => {
    expect(filterVehicles(vehicles, { yearFrom: 2019 }).map((v) => v.id)).toEqual(['v1', 'v2'])
    expect(filterVehicles(vehicles, { yearTo: 2018 }).map((v) => v.id)).toEqual(['v3'])
  })
  it('訂單號為部分比對且不分大小寫', () => {
    expect(filterVehicles(vehicles, { orderNo: '0142' }).map((v) => v.id)).toEqual(['v2'])
    expect(filterVehicles(vehicles, { orderNo: 'ord-2026' })).toHaveLength(3)
  })
  it('依車輛狀態篩選', () => {
    expect(filterVehicles(vehicles, { statuses: ['在庫'] })).toHaveLength(2)
  })
  it('條件可疊加', () => {
    expect(filterVehicles(vehicles, { brands: ['Toyota'], statuses: ['在庫'] }).map((v) => v.id)).toEqual(['v1'])
  })
})

describe('filterAuctions', () => {
  const vehicles = [
    makeVehicle({ id: 'v1', brand: 'Toyota', year: 2019, orderNo: 'ORD-1' }),
    makeVehicle({ id: 'v2', brand: 'Honda', year: 2021, orderNo: 'ORD-2' }),
  ]
  const auctions = [
    makeAuction({ id: 'a1', vehicleId: 'v1', type: 'SCHEDULED', status: '進行中' }),
    makeAuction({ id: 'a2', vehicleId: 'v2', type: 'SEALED', status: '已成交' }),
  ]

  it('依拍賣方式篩選', () => {
    expect(filterAuctions(auctions, vehicles, { types: ['SEALED'] }).map((a) => a.id)).toEqual(['a2'])
  })
  it('依拍賣狀態篩選', () => {
    expect(filterAuctions(auctions, vehicles, { statuses: ['進行中'] }).map((a) => a.id)).toEqual(['a1'])
  })
  it('依車輛條件篩選（廠牌、年份、訂單號）', () => {
    expect(filterAuctions(auctions, vehicles, { brands: ['Honda'] }).map((a) => a.id)).toEqual(['a2'])
    expect(filterAuctions(auctions, vehicles, { yearFrom: 2020 }).map((a) => a.id)).toEqual(['a2'])
    expect(filterAuctions(auctions, vehicles, { orderNo: 'ORD-1' }).map((a) => a.id)).toEqual(['a1'])
  })
  it('onlyIds 可與其他條件疊加', () => {
    expect(filterAuctions(auctions, vehicles, { onlyIds: ['a2'] }).map((a) => a.id)).toEqual(['a2'])
    expect(filterAuctions(auctions, vehicles, { onlyIds: ['a2'], types: ['SCHEDULED'] })).toHaveLength(0)
  })
  it('找不到對應車輛的拍賣被濾掉', () => {
    const orphan = [makeAuction({ id: 'a9', vehicleId: 'missing' })]
    expect(filterAuctions(orphan, vehicles, { brands: ['Toyota'] })).toHaveLength(0)
  })
})
