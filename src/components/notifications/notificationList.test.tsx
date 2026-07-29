import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationList } from '@/components/notifications/NotificationList'
import type { AppNotification } from '@/types'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()
const DAY = 86_400_000

function note(over: Partial<AppNotification> & { id: string; at: number }): AppNotification {
  return {
    userId: 'd1',
    type: 'LOST',
    auctionId: 'a1',
    title: `通知 ${over.id}`,
    body: '內容',
    read: true,
    ...over,
  }
}

describe('NotificationList 分組邊界', () => {
  it('未滿 1 天為今天、1–7 天為本週、超過 7 天為更早', () => {
    render(
      <NotificationList
        now={NOW}
        grouped
        onSelect={vi.fn()}
        notifications={[
          note({ id: 'today', at: NOW - 3 * 3_600_000 }),
          note({ id: 'week', at: NOW - 3 * DAY }),
          note({ id: 'old', at: NOW - 30 * DAY }),
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '本週' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '更早' })).toBeInTheDocument()
  })

  it('剛好 1 天算本週，剛好 7 天算更早', () => {
    render(
      <NotificationList
        now={NOW}
        grouped
        onSelect={vi.fn()}
        notifications={[note({ id: 'a', at: NOW - DAY }), note({ id: 'b', at: NOW - 7 * DAY })]}
      />,
    )
    expect(screen.queryByRole('heading', { name: '今天' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '本週' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '更早' })).toBeInTheDocument()
  })

  it('沒有內容的分組不顯示', () => {
    render(
      <NotificationList
        now={NOW}
        grouped
        onSelect={vi.fn()}
        notifications={[note({ id: 'a', at: NOW - 1_000 })]}
      />,
    )
    expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '本週' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '更早' })).not.toBeInTheDocument()
  })

  it('空清單顯示自訂空狀態文字', () => {
    render(<NotificationList notifications={[]} onSelect={vi.fn()} emptyText="沒東西" />)
    expect(screen.getByText('沒東西')).toBeInTheDocument()
  })

  it('未讀的有標記，已讀的沒有', () => {
    render(
      <NotificationList
        now={NOW}
        onSelect={vi.fn()}
        notifications={[
          note({ id: 'unread', at: NOW, read: false }),
          note({ id: 'read', at: NOW, read: true }),
        ]}
      />,
    )
    expect(screen.getAllByLabelText('未讀')).toHaveLength(1)
  })
})
