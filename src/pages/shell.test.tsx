import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, STAFF_ID } from '@/data/users'

describe('登入頁', () => {
  it('未登入時 / 導向登入頁，顯示三張示範帳號卡', () => {
    renderApp({ route: '/' })
    expect(screen.getByRole('heading', { name: '車輛拍賣平台' })).toBeInTheDocument()
    expect(screen.getByText('拍賣營運')).toBeInTheDocument()
    expect(screen.getByText('山田商事')).toBeInTheDocument()
    expect(screen.getByText('鈴木自動車')).toBeInTheDocument()
  })

  it('點公司人員卡片進入車庫管理', async () => {
    const { user } = renderApp({ route: '/login' })
    await user.click(screen.getByText('拍賣營運'))
    expect(await screen.findByRole('heading', { name: '車庫管理' })).toBeInTheDocument()
  })

  it('點車商卡片進入拍賣列表', async () => {
    const { user } = renderApp({ route: '/login' })
    await user.click(screen.getByText('山田商事'))
    expect(await screen.findByRole('heading', { name: '拍賣列表' })).toBeInTheDocument()
  })
})

describe('AppShell 導覽', () => {
  it('公司人員的側欄有車庫管理與拍賣管理', () => {
    renderApp({ route: '/admin/garage', userId: STAFF_ID })
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /車庫管理/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /拍賣管理/ })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /關注清單/ })).not.toBeInTheDocument()
  })

  it('車商的側欄有拍賣列表、關注清單與通知', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: /拍賣列表/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /關注清單/ })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /通知/ })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /車庫管理/ })).not.toBeInTheDocument()
  })

  it('頂欄顯示角色徽章與虛擬時間', () => {
    renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    expect(screen.getByText('二手車商')).toBeInTheDocument()
    expect(screen.getByText('2026/07/28 12:00')).toBeInTheDocument()
  })

  it('側欄可收合，收合後只剩 icon', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByText('拍賣列表')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '收合選單' }))
    expect(within(nav).queryByText('拍賣列表')).not.toBeInTheDocument()
  })
})

describe('角色守衛', () => {
  it('車商不能進入公司人員頁面，被導回自己的首頁', () => {
    renderApp({ route: '/admin/garage', userId: DEALER_A_ID })
    expect(screen.getByRole('heading', { name: '拍賣列表' })).toBeInTheDocument()
  })

  it('公司人員不能進入車商頁面，被導回自己的首頁', () => {
    renderApp({ route: '/dealer/auctions', userId: STAFF_ID })
    expect(screen.getByRole('heading', { name: '車庫管理' })).toBeInTheDocument()
  })

  it('未登入時進入受保護頁面被導向登入頁', () => {
    renderApp({ route: '/admin/garage' })
    expect(screen.getByText(/所有資料皆為假資料/)).toBeInTheDocument()
  })
})
