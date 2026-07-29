import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'
import { unreadCount } from '@/store/selectors'
import { currentPrice } from '@/store/selectors'

const unreadFor = (id: string) => unreadCount(useStore.getState().notifications, id)

describe('通知鈴鐺', () => {
  it('顯示未讀數', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const expected = unreadFor(DEALER_A_ID)
    expect(expected).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: `通知，${expected} 則未讀` })).toBeInTheDocument()
  })

  it('打開下拉可看到通知內容', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))

    expect(await screen.findByText('您的出價已被超越')).toBeInTheDocument()
  })

  it('全部標為已讀後未讀數消失', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))
    await user.click(await screen.findByRole('button', { name: '全部標為已讀' }))

    expect(unreadFor(DEALER_A_ID)).toBe(0)
    expect(screen.getByRole('button', { name: '通知' })).toBeInTheDocument()
  })

  it('markAllRead 只影響當前使用者', async () => {
    const beforeB = unreadFor(DEALER_B_ID)
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))
    await user.click(await screen.findByRole('button', { name: '全部標為已讀' }))

    expect(unreadFor(DEALER_A_ID)).toBe(0)
    expect(unreadFor(DEALER_B_ID)).toBe(beforeB)
  })

  it('點通知後標為已讀並跳到對應拍賣', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const before = unreadFor(DEALER_A_ID)

    await user.click(screen.getByRole('button', { name: /^通知/ }))
    await user.click(await screen.findByText('您的出價已被超越'))

    expect(unreadFor(DEALER_A_ID)).toBe(before - 1)
    expect(await screen.findByText('出價紀錄')).toBeInTheDocument()
  })
})

describe('公司人員的通知是內部事件', () => {
  it('鈴鐺內容為內部通知，且不含車商專屬的通知', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))

    const panel = await screen.findByText('上架 2 天無人出價')
    expect(panel).toBeInTheDocument()
    expect(screen.getByText('即將結標未達底價')).toBeInTheDocument()
    expect(screen.queryByText('您的出價已被超越')).not.toBeInTheDocument()
  })

  it('公司人員的鈴鐺沒有查看全部連結（那是車商頁）', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))
    expect(screen.queryByText(/^查看全部/)).not.toBeInTheDocument()
  })
})

describe('通知頁', () => {
  it('依時間分組，只顯示有內容的分組', () => {
    renderApp({ route: '/dealer/notifications', userId: DEALER_A_ID })
    // seed 最舊的通知是 5 天前，因此只會出現「今天」與「本週」
    expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '本週' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '更早' })).not.toBeInTheDocument()
  })


  it('顯示未讀數，全部標為已讀後改為全部已讀', async () => {
    const { user } = renderApp({ route: '/dealer/notifications', userId: DEALER_A_ID })
    const before = unreadFor(DEALER_A_ID)
    expect(screen.getByText(`${before} 則未讀`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '全部標為已讀' }))
    expect(screen.getByText('全部已讀')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '全部標為已讀' })).not.toBeInTheDocument()
  })

  it('點通知跳到對應拍賣', async () => {
    const { user } = renderApp({ route: '/dealer/notifications', userId: DEALER_A_ID })
    await user.click(screen.getAllByText('拍賣即將結標')[0])
    expect(await screen.findByText('出價紀錄')).toBeInTheDocument()
  })
})

describe('通知會隨動作即時產生', () => {
  it('被別人超越後未讀數增加', async () => {
    // 用車商 B 出價超越車商 A，再切回 A 看鈴鐺
    const { unmount } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    unmount()

    const store = useStore.getState()
    const leader = store.bids
      .filter((b) => b.auctionId === 'a-run-normal')
      .reduce((best, b) => (b.amount > best.amount ? b : best)).dealerId
    const price = currentPrice(store, 'a-run-normal')!
    const before = unreadFor(leader)

    store.submitBid({
      auctionId: 'a-run-normal',
      dealerId: leader === DEALER_A_ID ? DEALER_B_ID : DEALER_A_ID,
      amount: price + 10_000,
      now: Date.now(),
    })

    expect(unreadFor(leader)).toBeGreaterThan(before)
    expect(
      useStore.getState().notifications.some((n) => n.userId === leader && n.type === 'OUTBID'),
    ).toBe(true)
  })

  it('撤標後出價者與關注者都收到通知，且內文不含撤標理由', () => {
    const { unmount } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    unmount()

    useStore.getState().withdraw({
      auctionId: 'a-run-normal',
      reason: '借款人已清償欠款',
      byUserId: STAFF_ID,
    })

    const withdrawn = useStore
      .getState()
      .notifications.filter((n) => n.type === 'WITHDRAWN' && n.auctionId === 'a-run-normal')
    expect(withdrawn.length).toBeGreaterThan(0)
    for (const n of withdrawn) {
      expect(n.body).not.toContain('清償')
      expect(n.body).toContain('已下架')
    }
  })
})

describe('通知圖示', () => {
  it('需要立即反應的通知用紅色圖示', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /^通知/ }))

    const outbid = (await screen.findByText('您的出價已被超越')).closest('button')!
    // lucide 的 svg 沒有 role="img"，直接取元素
    const icon = outbid.querySelector('svg')!
    expect(icon.getAttribute('class')).toContain('text-rose-500')
  })
})
