import { describe, expect, it } from 'vitest'
import { bidStepFor, formatJPY, nextValidBid, validateBidAmount } from '@/lib/money'

const auto = { startPrice: 300_000, stepMode: 'auto' as const }

describe('formatJPY', () => {
  it('加上 ¥ 與千分位', () => {
    expect(formatJPY(1_820_000)).toBe('¥1,820,000')
    expect(formatJPY(0)).toBe('¥0')
  })
})

describe('bidStepFor auto 模式的邊界', () => {
  it('未滿 50 萬為 5,000', () => {
    expect(bidStepFor(0, 'auto')).toBe(5_000)
    expect(bidStepFor(499_999, 'auto')).toBe(5_000)
  })
  it('50 萬到未滿 200 萬為 10,000', () => {
    expect(bidStepFor(500_000, 'auto')).toBe(10_000)
    expect(bidStepFor(1_999_999, 'auto')).toBe(10_000)
  })
  it('200 萬以上為 50,000', () => {
    expect(bidStepFor(2_000_000, 'auto')).toBe(50_000)
    expect(bidStepFor(9_000_000, 'auto')).toBe(50_000)
  })
})

describe('bidStepFor fixed 模式', () => {
  it('忽略價格一律回傳 fixedStep', () => {
    expect(bidStepFor(100, 'fixed', 20_000)).toBe(20_000)
    expect(bidStepFor(5_000_000, 'fixed', 20_000)).toBe(20_000)
  })
  it('fixed 但沒給 fixedStep 時退回 auto', () => {
    expect(bidStepFor(600_000, 'fixed')).toBe(10_000)
  })
})

describe('nextValidBid', () => {
  it('無人出價時等於起標價', () => {
    expect(nextValidBid(auto, null)).toBe(300_000)
  })
  it('有人出價時為目前價加一級距', () => {
    expect(nextValidBid(auto, 300_000)).toBe(305_000)
    expect(nextValidBid(auto, 600_000)).toBe(610_000)
  })
  it('級距依目前價而非起標價決定', () => {
    expect(nextValidBid(auto, 2_000_000)).toBe(2_050_000)
  })
})

describe('validateBidAmount', () => {
  it('接受剛好等於合法出價的金額', () => {
    expect(validateBidAmount(auto, 300_000, 305_000)).toEqual({ ok: true })
  })
  it('接受更高且落在級距上的金額', () => {
    expect(validateBidAmount(auto, 300_000, 350_000)).toEqual({ ok: true })
  })
  it('拒絕低於合法出價的金額', () => {
    const r = validateBidAmount(auto, 300_000, 300_000)
    expect(r.ok).toBe(false)
  })
  it('拒絕不落在級距上的金額', () => {
    const r = validateBidAmount(auto, 300_000, 306_000)
    expect(r).toEqual({ ok: false, reason: '金額必須是 ¥5,000 的整數倍' })
  })
  it('拒絕非正整數', () => {
    expect(validateBidAmount(auto, null, 0).ok).toBe(false)
    expect(validateBidAmount(auto, null, 300_000.5).ok).toBe(false)
  })
})
