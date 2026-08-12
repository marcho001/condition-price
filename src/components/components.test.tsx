import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Countdown } from '@/components/auction/Countdown'
import { ReserveHint } from '@/components/auction/ReserveHint'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { useClock } from '@/clock/clockStore'
import { makeVehicle } from '@/engine/testFixtures'
import type { AuctionStatus } from '@/types'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

describe('Countdown', () => {
  // 凍結時間，否則 atNow() 到 render 之間真實時間會推進，倒數會少 1 秒
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    useClock.setState({ offsetMs: 0, speed: 1 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('顯示剩餘時間', () => {
    render(<Countdown to={NOW + 4 * 60_000 + 12_000} />)
    expect(screen.getByText('04:12')).toBeInTheDocument()
  })

  it('已過期顯示已結束', () => {
    render(<Countdown to={NOW - 1_000} />)
    expect(screen.getByText('已結束')).toBeInTheDocument()
  })

  it('5 分鐘內轉紅並脈動', () => {
    render(<Countdown to={NOW + 60_000} />)
    const el = screen.getByText('01:00')
    expect(el.className).toContain('text-rose-600')
    expect(el.className).toContain('animate-pulse')
  })

  it('超過 5 分鐘不轉紅', () => {
    render(<Countdown to={NOW + 10 * 60_000} />)
    expect(screen.getByText('10:00').className).not.toContain('text-rose-600')
  })

  it('已延長時顯示延長分鐘數', () => {
    render(<Countdown to={NOW + 60_000} extendedMs={9 * 60_000} />)
    expect(screen.getByText('已延長 9 分')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  const statuses: AuctionStatus[] = ['未開始', '進行中', '議價中', '已流標', '已成交']

  it('五種狀態各有不同色票', () => {
    const classes = statuses.map((s) => {
      const { unmount } = render(<StatusBadge status={s} />)
      const cls = screen.getByText(s).className
      unmount()
      return cls
    })
    expect(new Set(classes).size).toBe(5)
  })
})

describe('GradeBadge', () => {
  it('顯示車體與內裝評級', () => {
    render(<GradeBadge grade="4.5" interiorGrade="B" />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('/ B')).toBeInTheDocument()
  })

  it('事故車 R 標註為事故車', () => {
    render(<GradeBadge grade="R" />)
    expect(screen.getByTitle('事故車')).toBeInTheDocument()
  })
})

describe('ReserveHint', () => {
  it('未達底價顯示差額', () => {
    render(<ReserveHint reservePrice={2_000_000} currentPrice={1_500_000} />)
    expect(screen.getByText('尚差 ¥500,000')).toBeInTheDocument()
  })

  it('已達底價顯示已達底價', () => {
    render(<ReserveHint reservePrice={2_000_000} currentPrice={2_000_000} />)
    expect(screen.getByText('已達底價')).toBeInTheDocument()
  })

  it('無出價時差額等於底價', () => {
    render(<ReserveHint reservePrice={2_000_000} currentPrice={null} />)
    expect(screen.getByText('尚差 ¥2,000,000')).toBeInTheDocument()
  })
})

describe('SpecTable 的底價隔離', () => {
  it('showInternal 為 true 時顯示貸款餘額', () => {
    render(<SpecTable vehicle={makeVehicle({ loanBalance: 1_500_000 })} showInternal />)
    expect(screen.getByText('貸款餘額')).toBeInTheDocument()
    expect(screen.getByText('¥1,500,000')).toBeInTheDocument()
  })

  it('showInternal 為 false 時完全不顯示貸款餘額', () => {
    render(<SpecTable vehicle={makeVehicle({ loanBalance: 1_500_000 })} showInternal={false} />)
    expect(screen.queryByText('貸款餘額')).not.toBeInTheDocument()
    expect(screen.queryByText('¥1,500,000')).not.toBeInTheDocument()
  })
})
