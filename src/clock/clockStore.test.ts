import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClock } from '@/clock/clockStore'

const REAL = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(REAL)
  localStorage.clear()
  useClock.setState({ offsetMs: 0, speed: 1 })
})

describe('virtualNow', () => {
  it('offset 為 0 時等於真實時間', () => {
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })

  it('skip 會把虛擬時間往前推', () => {
    useClock.getState().skip(600_000)
    expect(useClock.getState().virtualNow()).toBe(REAL + 600_000)
  })

  it('多次 skip 會累加', () => {
    useClock.getState().skip(60_000)
    useClock.getState().skip(60_000)
    expect(useClock.getState().offsetMs).toBe(120_000)
  })

  it('真實時間前進時虛擬時間跟著前進', () => {
    useClock.getState().skip(600_000)
    vi.setSystemTime(REAL + 5_000)
    expect(useClock.getState().virtualNow()).toBe(REAL + 5_000 + 600_000)
  })
})

describe('speed', () => {
  it('1x 時 tick 不改變 offset', () => {
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(0)
  })

  it('10x 時 tick 250ms 讓 offset 增加 2250ms', () => {
    useClock.getState().setSpeed(10)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(2_250)
  })

  it('60x 時 tick 250ms 讓 offset 增加 14750ms', () => {
    useClock.getState().setSpeed(60)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(14_750)
  })

  it('暫停時 tick 把 offset 往回扣掉經過的真實時間', () => {
    useClock.getState().setSpeed(0)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(-250)
  })

  it('暫停期間真實時間前進，虛擬時間仍不動', () => {
    useClock.getState().setSpeed(0)
    // tick 宣稱經過 250ms，真實時間也必須同步前進，才是實際運行的狀態
    useClock.getState().tick(250)
    vi.setSystemTime(REAL + 250)
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })

  it('暫停後連續多次 tick，虛擬時間持續停在起點', () => {
    useClock.getState().setSpeed(0)
    for (let i = 1; i <= 4; i++) {
      useClock.getState().tick(250)
      vi.setSystemTime(REAL + i * 250)
      expect(useClock.getState().virtualNow()).toBe(REAL)
    }
  })
})

describe('resetToReal', () => {
  it('清掉 offset 並回到 1x', () => {
    useClock.getState().skip(86_400_000)
    useClock.getState().setSpeed(60)
    useClock.getState().resetToReal()
    expect(useClock.getState().offsetMs).toBe(0)
    expect(useClock.getState().speed).toBe(1)
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })
})

describe('持久化', () => {
  it('skip 會立刻寫入 localStorage', () => {
    useClock.getState().skip(600_000)
    expect(localStorage.getItem('auction-demo:clock-offset')).toBe('600000')
  })

  it('resetToReal 會把 localStorage 歸零', () => {
    useClock.getState().skip(600_000)
    useClock.getState().resetToReal()
    expect(localStorage.getItem('auction-demo:clock-offset')).toBe('0')
  })
})
