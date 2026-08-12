import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, STAFF_ID } from '@/data/users'
import { SCENARIOS } from '@/data/scenarios'
import { useStore } from '@/store/index'

const console_ = () => screen.getByLabelText('Demo 控制台')

async function openFull(user: ReturnType<typeof renderApp>['user']) {
  const expand = screen.queryByRole('button', { name: '展開' })
  if (expand) await user.click(expand)
  else await user.click(screen.getByRole('button', { name: '開啟 Demo 控制台' }))
}

describe('情境選擇器', () => {
  it('六組情境都列出來', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    for (const s of SCENARIOS) {
      expect(within(console_()).getByText(s.label)).toBeInTheDocument()
    }
  })

  it('點情境會先彈確認，取消後資料不變', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)
    const before = useStore.getState().bids.length

    await user.click(within(console_()).getByText('即將結標的熱門車'))
    expect(await screen.findByText(/會覆蓋目前所有拍賣、出價與通知資料/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(useStore.getState().bids).toHaveLength(before)
  })

  it('確認載入「即將結標的熱門車」後切到山田視角，卡片顯示您目前領先', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await openFull(user)

    await user.click(within(console_()).getByText('即將結標的熱門車'))
    await user.click(await screen.findByRole('button', { name: '確認載入' }))

    expect(useStore.getState().currentUserId).toBe(DEALER_A_ID)
    expect(await screen.findByRole('heading', { name: '拍賣列表' })).toBeInTheDocument()
    expect(screen.getAllByText('您目前領先').length).toBeGreaterThan(0)
  })

  it('載入「你被超越了」後顯示您已被超越', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(within(console_()).getByText('你被超越了'))
    await user.click(await screen.findByRole('button', { name: '確認載入' }))

    expect(screen.getAllByText('您已被超越').length).toBeGreaterThan(0)
  })

  it('載入「軟結標延長中」後顯示已延長 9 分', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(within(console_()).getByText('軟結標延長中'))
    await user.click(await screen.findByRole('button', { name: '確認載入' }))

    expect(screen.getAllByText('已延長 9 分').length).toBeGreaterThan(0)
  })

  it('載入「議價中」後山田在詳細頁看到議價邀請', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(within(console_()).getByText('議價中'))
    await user.click(await screen.findByRole('button', { name: '確認載入' }))

    const a = useStore.getState().auctions.find((x) => x.id === 'a-run-normal')!
    expect(a.status).toBe('議價中')
    expect(a.negotiation!.dealerId).toBe(DEALER_A_ID)
  })

  it('載入「密封投標開標前」後顯示尚未投標', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(within(console_()).getByText('密封投標開標前'))
    await user.click(await screen.findByRole('button', { name: '確認載入' }))

    expect(screen.getAllByText('尚未投標').length).toBeGreaterThan(0)
  })

})

describe('重置資料', () => {
  it('確認重置後回到登入頁，資料回到初始的 15 筆拍賣', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    // 先弄髒資料
    await user.click(screen.getByRole('button', { name: '加一級距' }))
    const dirty = useStore.getState().bids.length

    await user.click(within(console_()).getByRole('button', { name: /重置為初始資料/ }))
    await user.click(await screen.findByRole('button', { name: '確認重置' }))

    expect(useStore.getState().currentUserId).toBeNull()
    expect(useStore.getState().auctions).toHaveLength(15)
    expect(useStore.getState().bids.length).toBeLessThan(dirty)
    expect(await screen.findByText(/所有資料皆為假資料/)).toBeInTheDocument()
  })

  it('重置也會把虛擬時鐘歸零', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('button', { name: '+1 天' }))
    await user.click(within(console_()).getByRole('button', { name: /重置為初始資料/ }))
    await user.click(await screen.findByRole('button', { name: '確認重置' }))

    const { useClock } = await import('@/clock/clockStore')
    expect(useClock.getState().offsetMs).toBe(0)
  })
})
