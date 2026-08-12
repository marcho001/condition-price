import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'
import { currentPrice } from '@/store/selectors'

const auctionById = (id: string) => useStore.getState().auctions.find((a) => a.id === id)!
const console_ = () => screen.getByLabelText('Demo 控制台')

async function openFull(user: ReturnType<typeof renderApp>['user']) {
  const expand = screen.queryByRole('button', { name: '展開' })
  if (expand) await user.click(expand)
  else await user.click(screen.getByRole('button', { name: '開啟 Demo 控制台' }))
}

describe('控制台收合', () => {
  it('預設為精簡橫條，顯示虛擬時間與快轉鈕', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const mini = screen.getByLabelText('Demo 控制台（精簡）')
    expect(within(mini).getByText('2026/07/28 12:00')).toBeInTheDocument()
    expect(within(mini).getByRole('button', { name: '+10m' })).toBeInTheDocument()
  })

  it('展開後五個區塊都在', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    const panel = console_()
    for (const label of ['時間', '模擬出價', '強制狀態', '推送通知', '場景']) {
      expect(within(panel).getByRole('heading', { name: label })).toBeInTheDocument()
    }
  })

  it('可收成只剩圓鈕，再點開回到展開', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: '收起控制台' }))

    expect(screen.getByRole('button', { name: '開啟 Demo 控制台' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Demo 控制台（精簡）')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '開啟 Demo 控制台' }))
    expect(console_()).toBeInTheDocument()
  })

  it('展開後可縮小回精簡', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)
    await user.click(screen.getByRole('button', { name: '縮小控制台' }))
    expect(screen.getByLabelText('Demo 控制台（精簡）')).toBeInTheDocument()
  })

  it('反引號快捷鍵可開合，Esc 收成精簡', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })

    await user.keyboard('`')
    expect(console_()).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Demo 控制台（精簡）')).toBeInTheDocument()

    await user.keyboard('`')
    expect(console_()).toBeInTheDocument()
    await user.keyboard('`')
    expect(screen.getByRole('button', { name: '開啟 Demo 控制台' })).toBeInTheDocument()
  })

  it('在輸入框內按反引號只會輸入字元，不動控制台', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const input = screen.getByLabelText('訂單號')

    await user.click(input)
    await user.keyboard('`')

    expect((input as HTMLInputElement).value).toBe('`')
    expect(screen.getByLabelText('Demo 控制台（精簡）')).toBeInTheDocument()
  })

  it('位置可切到四個角落，狀態存在 localStorage', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('button', { name: '移到左上' }))
    expect(console_().className).toContain('top-20')
    expect(console_().className).toContain('left-4')
    expect(localStorage.getItem('auction-demo:console-corner')).toBe('tl')
    expect(localStorage.getItem('auction-demo:console-mode')).toBe('full')
  })

  it('全程為 fixed overlay，且面板可自行滾動', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    const panel = console_()
    expect(panel.className).toContain('fixed')
    expect(panel.className).toContain('max-h-[80vh]')
    expect(panel.querySelector('.overflow-y-auto')).not.toBeNull()
  })

  it('點面板外的頁面內容不會關閉面板', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('heading', { name: '拍賣列表' }))
    expect(console_()).toBeInTheDocument()
  })

  it('未登入時不顯示控制台', () => {
    renderApp({ route: '/login' })
    expect(screen.queryByLabelText(/Demo 控制台/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '開啟 Demo 控制台' })).not.toBeInTheDocument()
  })
})

describe('時間控制', () => {
  it('快轉 10 分鐘會推進虛擬時鐘並跑引擎', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const before = useClock.getState().virtualNow()

    await user.click(screen.getByRole('button', { name: '+10m' }))

    expect(useClock.getState().virtualNow()).toBeGreaterThanOrEqual(before + 600_000)
  })

  it('快轉 1 小時後即將結標的拍賣會結束', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('button', { name: '+1 小時' }))
    expect(auctionById('a-run-ending-soon').status).not.toBe('進行中')
  })

  it('速度切換會反映在按鈕的選取狀態', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('button', { name: '10x' }))
    expect(useClock.getState().speed).toBe(10)
    expect(screen.getByRole('button', { name: '10x' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '暫停' }))
    expect(useClock.getState().speed).toBe(0)
  })

  it('回到真實時間會清掉 offset 與加速', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(screen.getByRole('button', { name: '+1 天' }))
    await user.click(screen.getByRole('button', { name: '10x' }))
    await user.click(screen.getByRole('button', { name: '回到真實時間' }))

    expect(useClock.getState().offsetMs).toBe(0)
    expect(useClock.getState().speed).toBe(1)
  })
})

describe('模擬出價', () => {
  it('在詳細頁時預設選當前那筆拍賣', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    await openFull(user)

    const select = screen.getByLabelText('選擇拍賣') as HTMLSelectElement
    expect(select.value).toBe('a-run-normal')
    expect(select.selectedOptions[0].textContent).toContain('（當前頁面）')
  })

  it('加一級距會讓價格上升', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    await openFull(user)
    const before = currentPrice(useStore.getState(), 'a-run-normal')!

    await user.click(screen.getByRole('button', { name: '加一級距' }))

    expect(currentPrice(useStore.getState(), 'a-run-normal')!).toBeGreaterThan(before)
  })

  it('出價以選定的車商身分送出', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    await openFull(user)
    const beforeB = useStore
      .getState()
      .bids.filter((b) => b.auctionId === 'a-run-normal' && b.dealerId === DEALER_B_ID).length

    await user.selectOptions(screen.getByLabelText('選擇車商'), DEALER_B_ID)
    await user.click(screen.getByRole('button', { name: '加一級距' }))

    const afterB = useStore
      .getState()
      .bids.filter((b) => b.auctionId === 'a-run-normal' && b.dealerId === DEALER_B_ID)
    expect(afterB).toHaveLength(beforeB + 1)
  })

  it('只列出進行中的拍賣', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    const select = screen.getByLabelText('選擇拍賣') as HTMLSelectElement
    const running = useStore.getState().auctions.filter((a) => a.status === '進行中')
    expect(select.options).toHaveLength(running.length)
  })
})

describe('強制狀態', () => {
  it('立即結標依規則判定，不是硬改狀態', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await openFull(user)

    // a-run-extended 最高價為底價的 1.04 倍，依規則應成交
    await user.selectOptions(screen.getByLabelText('選擇要操作的拍賣'), 'a-run-extended')
    await user.click(screen.getByRole('button', { name: '立即結標' }))

    expect(auctionById('a-run-extended').status).toBe('已成交')
  })

  it('立即開標讓未開始的拍賣進入進行中', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await openFull(user)

    await user.selectOptions(screen.getByLabelText('選擇要操作的拍賣'), 'a-up-scheduled')
    await user.click(screen.getByRole('button', { name: '立即開標' }))

    expect(auctionById('a-up-scheduled').status).toBe('進行中')
  })

  it('強制流標把車輛退回在庫', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await openFull(user)

    await user.selectOptions(screen.getByLabelText('選擇要操作的拍賣'), 'a-run-normal')
    await user.click(screen.getByRole('button', { name: '強制流標' }))

    const a = auctionById('a-run-normal')
    expect(a.status).toBe('已流標')
    expect(useStore.getState().vehicles.find((v) => v.id === a.vehicleId)!.status).toBe('在庫')
  })

  it('強制議價需要已有出價', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await openFull(user)

    await user.selectOptions(screen.getByLabelText('選擇要操作的拍賣'), 'a-run-normal')
    await user.click(screen.getByRole('button', { name: '強制議價' }))

    expect(auctionById('a-run-normal').status).toBe('議價中')
    expect(auctionById('a-run-normal').negotiation).toBeDefined()
  })

})

describe('推送通知', () => {
  it('推送給指定使用者後對方未讀數增加', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)
    const before = useStore.getState().notifications.filter((n) => n.userId === DEALER_B_ID).length

    await user.selectOptions(screen.getByLabelText('收件者'), DEALER_B_ID)
    await user.selectOptions(screen.getByLabelText('通知類型'), 'WON')
    await user.click(screen.getByRole('button', { name: '立即推送' }))

    const after = useStore.getState().notifications.filter((n) => n.userId === DEALER_B_ID)
    expect(after).toHaveLength(before + 1)
    expect(after.at(-1)!.type).toBe('WON')
    expect(after.at(-1)!.read).toBe(false)
  })

  it('十一種通知類型都可選', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    const select = screen.getByLabelText('通知類型') as HTMLSelectElement
    expect(select.options).toHaveLength(11)
  })
})

describe('切換角色', () => {
  it('可從控制台直接切換身分並跳到對應首頁', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    await user.click(within(console_()).getByRole('button', { name: '拍賣營運' }))

    expect(useStore.getState().currentUserId).toBe(STAFF_ID)
    expect(await screen.findByRole('heading', { name: '車庫管理' })).toBeInTheDocument()
  })

  it('當前身分的按鈕為 disabled', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await openFull(user)

    expect(within(console_()).getByRole('button', { name: '山田商事' })).toBeDisabled()
  })
})
