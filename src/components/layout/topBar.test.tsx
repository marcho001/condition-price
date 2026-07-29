import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'

describe('頂欄的角色切換下拉', () => {
  it('打開下拉不會拋錯，並列出三個可登入帳號', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })

    await user.click(screen.getByRole('button', { name: /山田商事/ }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('切換角色')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /拍賣營運/ })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /鈴木自動車/ })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /登出/ })).toBeInTheDocument()
  })

  it('當前身分的項目為 disabled', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /山田商事/ }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /山田商事/ })).toHaveAttribute(
      'data-disabled',
    )
  })

  it('可切換到公司人員並跳到車庫管理', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /山田商事/ }))
    await user.click(await screen.findByRole('menuitem', { name: /拍賣營運/ }))

    expect(useStore.getState().currentUserId).toBe(STAFF_ID)
    expect(await screen.findByRole('heading', { name: '車庫管理' })).toBeInTheDocument()
  })

  it('登出會回到登入頁', async () => {
    const { user } = renderApp({ route: '/dealer/auctions', userId: DEALER_A_ID })
    await user.click(screen.getByRole('button', { name: /山田商事/ }))
    await user.click(await screen.findByRole('menuitem', { name: /登出/ }))

    expect(useStore.getState().currentUserId).toBeNull()
    expect(await screen.findByText(/所有資料皆為假資料/)).toBeInTheDocument()
  })
})
