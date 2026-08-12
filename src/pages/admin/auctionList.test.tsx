import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { STAFF_ID } from '@/data/users'

function cards() {
  return screen.getAllByText(/^ORD-2026-\d{4}$/)
}

describe('公司端拍賣列表', () => {
  it('顯示全部 15 筆拍賣', () => {
    renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    expect(cards()).toHaveLength(15)
    expect(screen.getByText('15 筆')).toBeInTheDocument()
  })

  it('進行中與議價中排在最前面', () => {
    renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    // 用 span 限定，否則會選到篩選列的同名按鈕
    const badges = screen
      .getAllByText(/^(未開始|進行中|議價中|已流標|已成交)$/, { selector: 'span' })
      .map((el) => el.textContent)
    expect(badges.slice(0, 5).every((s) => s === '進行中')).toBe(true)
    expect(badges.slice(5, 7).every((s) => s === '議價中')).toBe(true)
  })

  it('公司人員看得到底價提示', () => {
    renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    expect(screen.getAllByText('內部').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/^(已達底價|尚差 ¥[\d,]+)$/).length,
    ).toBeGreaterThan(0)
  })

  it('依拍賣方式篩選', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: '密封投標' }))
    // seed 有 5 筆密封標：1 未開始、1 進行中、1 議價中、1 已流標、1 已成交
    expect(cards()).toHaveLength(5)
  })

  it('拍賣方式與狀態可疊加篩選', async () => {
    const { user } = renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: '密封投標' }))
    await user.click(screen.getByRole('button', { name: '進行中' }))
    expect(cards()).toHaveLength(1)
  })

  it('已成交卡片顯示結標金額', () => {
    renderApp({
      route: `/admin/auctions?statuses=${encodeURIComponent('已成交')}`,
      userId: STAFF_ID,
    })
    expect(screen.getAllByText('結標金額')).toHaveLength(2)
  })

  it('已流標卡片顯示流標原因', () => {
    renderApp({
      route: `/admin/auctions?statuses=${encodeURIComponent('已流標')}`,
      userId: STAFF_ID,
    })
    expect(screen.getByText('流標 · 無人出價')).toBeInTheDocument()
    expect(screen.getAllByText('流標 · 未達底價').length).toBeGreaterThan(0)
  })

  it('密封投標進行中只顯示投標家數，不顯示金額', () => {
    renderApp({
      route: `/admin/auctions?types=SEALED&statuses=${encodeURIComponent('進行中')}`,
      userId: STAFF_ID,
    })
    expect(screen.getByText('密封投標中')).toBeInTheDocument()
    expect(screen.getByText(/^共 \d+ 家投標$/)).toBeInTheDocument()
  })

  it('已延長的拍賣顯示延長標記', () => {
    renderApp({ route: '/admin/auctions', userId: STAFF_ID })
    expect(screen.getByText('已延長 9 分')).toBeInTheDocument()
  })

  it('未開始的拍賣有可用的編輯連結', () => {
    renderApp({
      route: `/admin/auctions?statuses=${encodeURIComponent('未開始')}`,
      userId: STAFF_ID,
    })
    expect(screen.getAllByRole('link', { name: '編輯' })).toHaveLength(3)
  })

  it('進行中的拍賣編輯鈕為 disabled，且不是連結', () => {
    renderApp({
      route: `/admin/auctions?statuses=${encodeURIComponent('進行中')}`,
      userId: STAFF_ID,
    })
    expect(screen.queryAllByRole('link', { name: '編輯' })).toHaveLength(0)
    const buttons = screen.getAllByRole('button', { name: '編輯' })
    expect(buttons).toHaveLength(5)
    for (const btn of buttons) {
      expect(btn).toBeDisabled()
    }
  })

  it('未開始的拍賣顯示開標時間而非倒數', () => {
    renderApp({
      route: `/admin/auctions?statuses=${encodeURIComponent('未開始')}`,
      userId: STAFF_ID,
    })
    expect(screen.getAllByText(/^開標 2026\//).length).toBe(3)
  })
})
