import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, DEALER_B_ID } from '@/data/users'
import { useStore } from '@/store/index'
import { currentPrice, myHighestBid } from '@/store/selectors'
import { nextValidBid } from '@/lib/money'

const auctionById = (id: string) => useStore.getState().auctions.find((a) => a.id === id)!

describe('詳細頁 — 底價隔離', () => {
  it('規格表不含貸款餘額', () => {
    renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    expect(screen.queryByText('貸款餘額')).not.toBeInTheDocument()
  })

  it('沒有任何底價提示', () => {
    renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    expect(screen.queryByText('內部')).not.toBeInTheDocument()
    expect(screen.queryByText(/^尚差 ¥/)).not.toBeInTheDocument()
  })
})

describe('詳細頁 — 出價', () => {
  it('一鍵加一級距後價格上升，出價紀錄標記為您', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    const before = currentPrice(useStore.getState(), 'a-run-normal')!

    await user.click(screen.getByRole('button', { name: /\+ 一級距/ }))
    await user.click(await screen.findByRole('button', { name: '確認送出' }))

    expect(currentPrice(useStore.getState(), 'a-run-normal')!).toBeGreaterThan(before)
    expect(screen.getAllByText('（您）').length).toBeGreaterThan(0)
  })

  it('確認 Dialog 顯示金額、目前最高價與差額', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })

    await user.click(screen.getByRole('button', { name: /\+ 一級距/ }))

    // 「目前最高價」側欄與 Dialog 都有，必須限定在 Dialog 內
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('您的出價金額')).toBeInTheDocument()
    expect(within(dialog).getByText('目前最高價')).toBeInTheDocument()
    expect(within(dialog).getByText('高出目前價')).toBeInTheDocument()
  })

  it('非級距倍數的金額被即時擋下', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    const auction = auctionById('a-run-normal')
    const price = currentPrice(useStore.getState(), 'a-run-normal')!
    const min = nextValidBid(auction, price)

    // 必須高於最低出價，否則觸發的是「至少需出」而不是級距規則
    const offGrid = min + 1_234

    const input = screen.getByLabelText('自訂金額')
    await user.clear(input)
    await user.type(input, String(offGrid))

    expect(screen.getByText(/整數倍/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '以此金額出價' })).toBeDisabled()
  })

  it('低於合法出價的金額被擋下', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })

    const input = screen.getByLabelText('自訂金額')
    await user.clear(input)
    await user.type(input, '100000')

    expect(screen.getByText(/^至少需出 ¥/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '以此金額出價' })).toBeDisabled()
  })

  it('金額異常偏高時必須勾選確認才能送出', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    const price = currentPrice(useStore.getState(), 'a-run-normal')!
    const auction = auctionById('a-run-normal')

    const input = screen.getByLabelText('自訂金額')
    await user.clear(input)
    // 目前價的 2 倍，且落在級距上
    const abnormal = auction.startPrice + Math.ceil((price * 2 - auction.startPrice) / 10_000) * 10_000
    await user.type(input, String(abnormal))
    await user.click(screen.getByRole('button', { name: '以此金額出價' }))

    const confirm = await screen.findByRole('button', { name: '確認送出' })
    expect(screen.getByText(/明顯偏高/)).toBeInTheDocument()
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('checkbox'))
    expect(confirm).not.toBeDisabled()
  })
})

describe('詳細頁 — 密封投標', () => {
  it('沒有一鍵加級距鈕，出價紀錄不揭露', () => {
    renderApp({ route: '/dealer/auctions/a-run-sealed', userId: DEALER_A_ID })
    expect(screen.queryByRole('button', { name: /\+ 一級距/ })).not.toBeInTheDocument()
    expect(screen.getByText(/密封投標在結標前不揭露任何出價紀錄/)).toBeInTheDocument()
  })

  it('投標後變成已投標，無法再投第二次', async () => {
    const auction = auctionById('a-run-sealed')
    const dealer = useStore
      .getState()
      .bids.some((b) => b.auctionId === 'a-run-sealed' && b.dealerId === DEALER_A_ID)
      ? DEALER_B_ID
      : DEALER_A_ID

    const { user } = renderApp({ route: '/dealer/auctions/a-run-sealed', userId: dealer })
    if (myHighestBid(useStore.getState(), 'a-run-sealed', dealer)) {
      expect(screen.getByText('您已投標')).toBeInTheDocument()
      return
    }

    const input = screen.getByLabelText('投標金額')
    await user.clear(input)
    await user.type(input, String(auction.startPrice + 100_000))
    await user.click(screen.getByRole('button', { name: '送出密封投標' }))
    await user.click(await screen.findByRole('button', { name: '確認送出' }))

    expect(await screen.findByText('您已投標')).toBeInTheDocument()
    expect(screen.getByText(/僅能投標一次/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '送出密封投標' })).not.toBeInTheDocument()
  })
})

describe('詳細頁 — 議價', () => {
  it('被邀請者看到議價邀請與兩個操作', () => {
    const invited = auctionById('a-nego-a').negotiation!.dealerId
    renderApp({ route: '/dealer/auctions/a-nego-a', userId: invited })

    expect(screen.getByText('議價邀請')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /加價至 ¥[\d,]+ 成交/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument()
  })

  it('非被邀請者只看到議價中的說明，不揭露金額', () => {
    const invited = auctionById('a-nego-a').negotiation!.dealerId
    const other = invited === DEALER_A_ID ? DEALER_B_ID : DEALER_A_ID
    renderApp({ route: '/dealer/auctions/a-nego-a', userId: other })

    expect(screen.getByText('這筆拍賣未達底價，目前正在與最高出價者議價中。')).toBeInTheDocument()
    expect(screen.queryByText('議價邀請')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /加價至/ })).not.toBeInTheDocument()
  })

  it('接受議價後成交，顯示您得標', async () => {
    const invited = auctionById('a-nego-a').negotiation!.dealerId
    const amount = auctionById('a-nego-a').negotiation!.amount
    const { user } = renderApp({ route: '/dealer/auctions/a-nego-a', userId: invited })

    await user.click(screen.getByRole('button', { name: /加價至 ¥[\d,]+ 成交/ }))

    const a = auctionById('a-nego-a')
    expect(a.status).toBe('已成交')
    expect(a.deal!.amount).toBe(amount)
    expect(await screen.findByText('您得標')).toBeInTheDocument()
  })
})

describe('詳細頁 — 其他狀態', () => {
  it('未開始顯示開標時間，沒有出價區', () => {
    renderApp({ route: '/dealer/auctions/a-up-scheduled', userId: DEALER_A_ID })
    expect(screen.getByText('開標時間')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ 一級距/ })).not.toBeInTheDocument()
  })

  it('已流標顯示流標原因', () => {
    renderApp({ route: '/dealer/auctions/a-passed-low', userId: DEALER_A_ID })
    expect(screen.getAllByText('流標 · 未達底價').length).toBeGreaterThan(0)
  })

  it('關注鈕可切換', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    const watchedBefore = useStore
      .getState()
      .watches.some((w) => w.auctionId === 'a-run-normal' && w.dealerId === DEALER_A_ID)

    await user.click(screen.getByRole('button', { name: watchedBefore ? '取消關注' : '關注' }))

    expect(
      useStore
        .getState()
        .watches.some((w) => w.auctionId === 'a-run-normal' && w.dealerId === DEALER_A_ID),
    ).toBe(!watchedBefore)
  })

  it('照片輪播可切換', async () => {
    const { user } = renderApp({ route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID })
    const total = useStore
      .getState()
      .vehicles.find((v) => v.id === auctionById('a-run-normal').vehicleId)!.photoSeeds.length
    expect(screen.getByText(`1 / ${total}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一張' }))
    expect(screen.getByText(`2 / ${total}`)).toBeInTheDocument()
  })
})
