import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'
import { currentPrice } from '@/store/selectors'

const auctionById = (id: string) => useStore.getState().auctions.find((a) => a.id === id)!

describe('拍賣監控頁 — 數據與出價紀錄', () => {
  it('數據列五欄齊全，底價帶鎖頭', () => {
    renderApp({ route: '/admin/auctions/a-run-ending-soon', userId: STAFF_ID })
    for (const label of ['目前最高價', '出價筆數', '參與車商數', '底價', '已延長']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('出價紀錄用匿名代號，不揭露車商名稱', () => {
    renderApp({ route: '/admin/auctions/a-run-ending-soon', userId: STAFF_ID })
    expect(screen.getAllByText(/^出價者 [A-Z]$/).length).toBeGreaterThan(0)
    expect(screen.queryByText('山田商事')).not.toBeInTheDocument()
    expect(screen.queryByText('鈴木自動車')).not.toBeInTheDocument()
  })

  it('代理出價有標記，但完全不顯示代理上限', () => {
    renderApp({ route: '/admin/auctions/a-run-ending-soon', userId: STAFF_ID })
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0)

    // seed 在這筆拍賣掛了代理，上限金額不得出現在畫面上
    const proxy = useStore
      .getState()
      .proxies.find((p) => p.auctionId === 'a-run-ending-soon')
    if (proxy) {
      expect(
        screen.queryByText(`¥${proxy.maxAmount.toLocaleString('en-US')}`),
      ).not.toBeInTheDocument()
    }
  })

  it('密封投標進行中不揭露出價紀錄', () => {
    renderApp({ route: '/admin/auctions/a-run-sealed', userId: STAFF_ID })
    expect(screen.getByText(/密封投標在結標前不揭露任何出價紀錄/)).toBeInTheDocument()
    expect(screen.queryAllByText(/^出價者 [A-Z]$/)).toHaveLength(0)
  })

  it('已延長的拍賣顯示延長分鐘數與原定結標時間', () => {
    renderApp({ route: '/admin/auctions/a-run-extended', userId: STAFF_ID })
    expect(screen.getByText('9 分鐘')).toBeInTheDocument()
    expect(screen.getByText(/^原定 2026\//)).toBeInTheDocument()
  })

  it('公司人員看得到貸款餘額', () => {
    renderApp({ route: '/admin/auctions/a-run-normal', userId: STAFF_ID })
    expect(screen.getByText('貸款餘額')).toBeInTheDocument()
  })
})

describe('議價處理', () => {
  it('顯示議價區塊與三個操作', () => {
    renderApp({ route: '/admin/auctions/a-nego-a', userId: STAFF_ID })
    expect(screen.getByText('議價處理')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /接受目前最高價/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '調整底價' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '放棄議價' })).toBeInTheDocument()
  })

  it('接受目前最高價後成交，金額等於最高出價', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-nego-a', userId: STAFF_ID })
    const top = currentPrice(useStore.getState(), 'a-nego-a')!

    await user.click(screen.getByRole('button', { name: /接受目前最高價/ }))

    const a = auctionById('a-nego-a')
    expect(a.status).toBe('已成交')
    expect(a.deal!.amount).toBe(top)
  })

  it('調降底價到最高價之下立即成交', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-nego-a', userId: STAFF_ID })
    const top = currentPrice(useStore.getState(), 'a-nego-a')!

    await user.click(screen.getByRole('button', { name: '調整底價' }))
    const input = await screen.findByLabelText('新底價')
    await user.clear(input)
    await user.type(input, String(top - 10_000))
    await user.click(screen.getByRole('button', { name: '確認調整' }))

    expect(auctionById('a-nego-a').status).toBe('已成交')
  })

  it('調高底價被拒，狀態不變', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-nego-a', userId: STAFF_ID })
    const before = auctionById('a-nego-a').reservePrice

    await user.click(screen.getByRole('button', { name: '調整底價' }))
    const input = await screen.findByLabelText('新底價')
    await user.clear(input)
    await user.type(input, String(before + 100_000))
    await user.click(screen.getByRole('button', { name: '確認調整' }))

    expect(auctionById('a-nego-a').status).toBe('議價中')
    expect(auctionById('a-nego-a').reservePrice).toBe(before)
  })

  it('放棄議價後改邀次高出價者', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-nego-a', userId: STAFF_ID })
    const first = auctionById('a-nego-a').negotiation!.dealerId

    await user.click(screen.getByRole('button', { name: '放棄議價' }))

    const a = auctionById('a-nego-a')
    if (a.status === '議價中') {
      expect(a.negotiation!.dealerId).not.toBe(first)
      expect(a.negotiation!.declinedDealerIds).toContain(first)
    } else {
      expect(a.status).toBe('已流標')
      expect(a.closeReason).toBe('議價失敗')
    }
  })

  it('非議價中的拍賣沒有議價區塊', () => {
    renderApp({ route: '/admin/auctions/a-run-normal', userId: STAFF_ID })
    expect(screen.queryByText('議價處理')).not.toBeInTheDocument()
  })
})

describe('撤標', () => {
  it('理由少於 5 字時確認鈕 disabled', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-run-normal', userId: STAFF_ID })

    await user.click(screen.getByRole('button', { name: '撤標' }))
    const confirm = await screen.findByRole('button', { name: '確認撤標' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/撤標理由/), '不賣')
    expect(confirm).toBeDisabled()
  })

  it('填滿理由後撤標成功，顯示撤標紀錄與車商端不可見的說明', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-run-normal', userId: STAFF_ID })

    await user.click(screen.getByRole('button', { name: '撤標' }))
    await user.type(screen.getByLabelText(/撤標理由/), '借款人已清償欠款')
    await user.click(screen.getByRole('button', { name: '確認撤標' }))

    const a = auctionById('a-run-normal')
    expect(a.status).toBe('已撤標')
    expect(a.withdrawReason).toBe('借款人已清償欠款')
    expect(a.withdrawnBy).toBe(STAFF_ID)

    expect(await screen.findByText('撤標紀錄')).toBeInTheDocument()
    expect(screen.getByText('理由：借款人已清償欠款')).toBeInTheDocument()
    expect(screen.getByText(/車商端只會看到「已下架」/)).toBeInTheDocument()
  })

  it('撤標後車輛轉為已下架，且該拍賣的代理出價全部停用', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-run-normal', userId: STAFF_ID })
    const vehicleId = auctionById('a-run-normal').vehicleId

    await user.click(screen.getByRole('button', { name: '撤標' }))
    await user.type(screen.getByLabelText(/撤標理由/), '車輛有查扣爭議')
    await user.click(screen.getByRole('button', { name: '確認撤標' }))

    expect(useStore.getState().vehicles.find((v) => v.id === vehicleId)!.status).toBe('已下架')
    expect(
      useStore.getState().proxies.filter((p) => p.auctionId === 'a-run-normal' && p.active),
    ).toHaveLength(0)
  })

  it('已成交的拍賣沒有撤標鈕', () => {
    renderApp({ route: '/admin/auctions/a-deal-a', userId: STAFF_ID })
    expect(screen.queryByRole('button', { name: '撤標' })).not.toBeInTheDocument()
    expect(screen.getByText('成交')).toBeInTheDocument()
  })
})
