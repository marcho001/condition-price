import { describe, expect, it } from 'vitest'
import { formatDuration, fromDateTimeLocal, toDateTimeLocal } from '@/lib/time'

describe('formatDuration', () => {
  it('未滿 1 小時顯示 mm:ss', () => {
    expect(formatDuration(42_000)).toBe('00:42')
    expect(formatDuration(4 * 60_000 + 12_000)).toBe('04:12')
  })
  it('未滿 1 天顯示 hh:mm:ss', () => {
    expect(formatDuration(3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe('03:04:05')
  })
  it('超過 1 天加上天數', () => {
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000)).toBe('2 天 03:00:00')
  })
  it('負數或零一律顯示 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(-5_000)).toBe('00:00')
  })
})

describe('datetime-local 互轉', () => {
  it('轉出去再轉回來得到同一分鐘', () => {
    const ms = new Date(2026, 6, 28, 14, 30, 0, 0).getTime()
    const local = toDateTimeLocal(ms)
    expect(local).toBe('2026-07-28T14:30')
    expect(fromDateTimeLocal(local)).toBe(ms)
  })
})
