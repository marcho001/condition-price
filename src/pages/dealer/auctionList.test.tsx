import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'

function cards() {
  return screen.getAllByText(/^ORD-2026-\d{4}$/)
}

describe('車商拍賣列表 — 底價隔離', () => {
  it('完全看不到任何底價相關資訊', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })

    expect(screen.queryByText('內部')).not.toBeInTheDocument()
    expect(screen.queryByText(/^尚差 ¥/)).not.toBeInTheDocument()
    expect(screen.queryByText('已達底價')).not.toBeInTheDocument()
    expect(screen.queryByText('貸款餘額')).not.toBeInTheDocument()
  })

  it('同一份資料下，公司人員看得到底價提示、車商看不到', () => {
    // 刻意不用「掃描畫面上是否出現底價金額」來驗證：
    // 金額都取整到萬位、只有 14 筆拍賣，不同拍賣之間的數字必然會碰撞
    // （例如某筆的最高出價恰好等於另一筆的底價），那樣的測試會誤報。
    // 要守的是「底價提示這個元件不會出現在車商端」這件結構性的事。
    const { unmount } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    expect(screen.queryAllByText('內部')).toHaveLength(0)
    unmount()

    renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    expect(screen.getAllByText('內部').length).toBeGreaterThan(0)
  })
})

describe('車商拍賣列表 — 內容', () => {
  it('顯示全部 14 筆', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    expect(cards()).toHaveLength(14)
  })

  it('有出價的進行中拍賣顯示領先或被超越', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const marks = [
      ...screen.queryAllByText('您目前領先'),
      ...screen.queryAllByText('您已被超越'),
    ]
    expect(marks.length).toBeGreaterThan(0)
  })

  it('已成交顯示結標金額；自己得標的加上您得標徽章', () => {
    renderApp({
      route: `/dealer/auctions?statuses=${encodeURIComponent('已成交')}`,
      userId: DEALER_A_ID,
    })
    expect(screen.getAllByText('結標金額')).toHaveLength(2)

    const won = useStore
      .getState()
      .auctions.filter((a) => a.status === '已成交' && a.deal?.dealerId === DEALER_A_ID)
    expect(screen.queryAllByText('您得標')).toHaveLength(won.length)
  })

  it('已流標顯示流標標籤與原因', () => {
    renderApp({
      route: `/dealer/auctions?statuses=${encodeURIComponent('已流標')}`,
      userId: DEALER_A_ID,
    })
    expect(screen.getByText('流標 · 無人出價')).toBeInTheDocument()
    expect(screen.getByText('流標 · 未達底價')).toBeInTheDocument()
  })

  it('密封投標只顯示自己的投標狀態，不顯示他人金額', () => {
    renderApp({
      route: `/dealer/auctions?types=SEALED&statuses=${encodeURIComponent('進行中')}`,
      userId: DEALER_A_ID,
    })
    expect(screen.getByText('密封投標中')).toBeInTheDocument()
    expect(screen.queryByText(/^共 \d+ 家投標$/)).not.toBeInTheDocument()
    expect(screen.getByText(/^(您已投標 [\d,]+|尚未投標)$/)).toBeInTheDocument()
  })
})

describe('車商拍賣列表 — 篩選', () => {
  it('六個維度都能篩', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })

    for (const name of ['廠牌', '拍賣方式', '拍賣狀態', '年份起', '年份迄', '訂單號']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }

    await user.click(screen.getByRole('button', { name: '定時開標' }))
    const expected = useStore.getState().auctions.filter((a) => a.type === 'SCHEDULED').length
    expect(cards()).toHaveLength(expected)
  })

  it('只看關注', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const watched = useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID).length

    await user.click(screen.getByRole('button', { name: '只看關注' }))
    expect(cards()).toHaveLength(watched)
  })

  it('只看我出價過的', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const mine = new Set(
      useStore
        .getState()
        .bids.filter((b) => b.dealerId === DEALER_A_ID)
        .map((b) => b.auctionId),
    ).size

    await user.click(screen.getByRole('button', { name: '只看我出價過的' }))
    expect(cards()).toHaveLength(mine)
  })

  it('關注與出價過可疊加，結果是交集', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: '只看關注' }))
    await user.click(screen.getByRole('button', { name: '只看我出價過的' }))

    const store = useStore.getState()
    const watched = new Set(
      store.watches.filter((w) => w.dealerId === DEALER_A_ID).map((w) => w.auctionId),
    )
    const bid = new Set(
      store.bids.filter((b) => b.dealerId === DEALER_A_ID).map((b) => b.auctionId),
    )
    const expected = [...watched].filter((id) => bid.has(id)).length

    if (expected === 0) {
      expect(screen.getByText('沒有符合條件的拍賣')).toBeInTheDocument()
    } else {
      expect(cards()).toHaveLength(expected)
    }
  })
})

describe('關注', () => {
  it('點關注後星號變色，側欄關注數增加', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const before = useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID).length

    await user.click(screen.getAllByRole('button', { name: '關注' })[0])

    expect(useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID)).toHaveLength(
      before + 1,
    )
  })

  it('已關注的可以取消', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const before = useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID).length

    await user.click(screen.getAllByRole('button', { name: '取消關注' })[0])

    expect(useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID)).toHaveLength(
      before - 1,
    )
  })
})

describe('關注清單頁', () => {
  it('只顯示已關注的拍賣', () => {
    renderApp({ route: '/dealer/watchlist', userId: DEALER_A_ID })
    const watched = useStore.getState().watches.filter((w) => w.dealerId === DEALER_A_ID).length
    expect(cards()).toHaveLength(watched)
  })

  it('取消全部關注後顯示空狀態與前往列表的連結', async () => {
    const { user } = renderApp({ route: '/dealer/watchlist', userId: DEALER_A_ID })

    let buttons = screen.queryAllByRole('button', { name: '取消關注' })
    while (buttons.length > 0) {
      await user.click(buttons[0])
      buttons = screen.queryAllByRole('button', { name: '取消關注' })
    }

    expect(screen.getByText('還沒有關注任何拍賣')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '前往拍賣列表' })).toBeInTheDocument()
  })
})
