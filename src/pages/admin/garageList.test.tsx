import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'

function cards() {
  // 每張車輛卡片都帶一個訂單號
  return screen.getAllByText(/^ORD-2026-\d{4}$/)
}

function resultCount() {
  return screen.getByText(/^\d+ 筆$/).textContent
}

describe('車庫列表', () => {
  it('以 gallery 呈現全部 27 台車', () => {
    renderApp({ route: '/admin/garage', userId: STAFF_ID })
    expect(cards()).toHaveLength(27)
    expect(resultCount()).toBe('27 筆')
  })

  it('依廠牌篩選', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: 'Toyota' }))

    const toyotaCount = useStore.getState().vehicles.filter((v) => v.brand === 'Toyota').length
    expect(cards()).toHaveLength(toyotaCount)
    expect(resultCount()).toBe(`${toyotaCount} 筆`)
  })

  it('廠牌可多選，結果是聯集', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: 'Toyota' }))
    await user.click(screen.getByRole('button', { name: 'Honda' }))

    const expected = useStore
      .getState()
      .vehicles.filter((v) => v.brand === 'Toyota' || v.brand === 'Honda').length
    expect(cards()).toHaveLength(expected)
  })

  it('依年份區間篩選', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    await user.type(screen.getByLabelText('年份起'), '2020')

    const expected = useStore.getState().vehicles.filter((v) => v.year >= 2020).length
    expect(cards()).toHaveLength(expected)
  })

  it('訂單號為部分比對', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    const target = useStore.getState().vehicles[3].orderNo
    await user.type(screen.getByLabelText('訂單號'), target.slice(-4))

    expect(cards()).toHaveLength(1)
    expect(screen.getByText(target)).toBeInTheDocument()
  })

  it('篩到 0 筆時顯示空狀態，可一鍵清除', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    await user.type(screen.getByLabelText('訂單號'), 'ORD-9999')

    expect(screen.getByText('沒有符合條件的車輛')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '清除篩選條件' }))
    expect(cards()).toHaveLength(27)
  })

  it('篩選條件寫進 URL query，可分享連結', () => {
    renderApp({ route: '/admin/garage?brands=Lexus', userId: STAFF_ID })
    const expected = useStore.getState().vehicles.filter((v) => v.brand === 'Lexus').length
    expect(cards()).toHaveLength(expected)
    expect(screen.getByRole('button', { name: 'Lexus' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('排序可切換為里程由低到高', async () => {
    const { user } = renderApp({ route: '/admin/garage', userId: STAFF_ID })
    await user.selectOptions(screen.getByLabelText('排序'), 'mileage')

    const shown = screen.getAllByText(/km$/).map((el) => Number(el.textContent!.replace(/[^\d]/g, '')))
    expect(shown).toEqual([...shown].sort((a, b) => a - b))
  })

  it('非在庫的車輛不能排拍', () => {
    renderApp({ route: '/admin/garage?statuses=%E5%B7%B2%E5%94%AE%E5%87%BA', userId: STAFF_ID })
    for (const btn of screen.getAllByRole('button', { name: '排拍' })) {
      expect(btn).toBeDisabled()
    }
  })

  it('在庫的車輛可以排拍', () => {
    renderApp({ route: '/admin/garage?statuses=%E5%9C%A8%E5%BA%AB', userId: STAFF_ID })
    for (const btn of screen.getAllByRole('button', { name: '排拍' })) {
      expect(btn).not.toBeDisabled()
    }
  })

  it('每張卡片都有編輯連結', () => {
    renderApp({ route: '/admin/garage?brands=Lexus', userId: STAFF_ID })
    const links = screen.getAllByRole('link', { name: '編輯' })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/admin/garage/'))
  })

  it('車輛卡片顯示評級、里程與狀態', () => {
    renderApp({ route: '/admin/garage?brands=Lexus', userId: STAFF_ID })
    const first = screen.getAllByText(/^ORD-2026-\d{4}$/)[0].closest('div')!.parentElement!
    expect(within(first).getByText(/km$/)).toBeInTheDocument()
  })
})
