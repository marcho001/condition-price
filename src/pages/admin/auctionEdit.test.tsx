import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'

const freeVehicle = () => useStore.getState().vehicles.find((v) => v.status === '在庫')!

describe('新增拍賣', () => {
  it('從車庫帶 vehicleId 進來時該車已預選', () => {
    const car = freeVehicle()
    renderApp({ route: `/admin/auctions/new?vehicleId=${car.id}`, userId: STAFF_ID })

    const btn = screen.getByText(car.orderNo).closest('button')!
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('車輛清單只列出在庫車輛', () => {
    renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })
    const inStock = useStore.getState().vehicles.filter((v) => v.status === '在庫')
    const notInStock = useStore.getState().vehicles.find((v) => v.status === '拍賣中')!

    expect(screen.getByText(inStock[0].orderNo)).toBeInTheDocument()
    expect(screen.queryByText(notInStock.orderNo)).not.toBeInTheDocument()
  })

  it('預設為定時開標，沒有立即成交價欄位', () => {
    renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })
    expect(screen.getByRole('button', { name: /定時開標/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('立即成交價')).not.toBeInTheDocument()
  })

  it('切到密封投標後出現立即成交價，切回去會消失', async () => {
    const { user } = renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })

    await user.click(screen.getByRole('button', { name: /密封投標/ }))
    expect(screen.getByLabelText('立即成交價')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /定時開標/ }))
    expect(screen.queryByLabelText('立即成交價')).not.toBeInTheDocument()
  })

  it('切到即時同步拍時結標時間自動變成開始後 90 秒', async () => {
    const { user } = renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: /即時同步拍/ }))
    expect(screen.getByText('即時同步拍建議 60–120 秒。目前設定為 90 秒。')).toBeInTheDocument()
  })

  it('喊價單位切到固定金額會出現輸入框，並更新底部提示', async () => {
    const { user } = renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })

    expect(screen.getByText('¥500,000 – 未滿 ¥2,000,000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '固定金額' }))

    const input = screen.getByLabelText('固定喊價單位')
    await user.type(input, '25000')
    expect(screen.getByText('¥25,000')).toBeInTheDocument()
  })

  it('底價低於起標價時被擋下，不建立拍賣', async () => {
    const car = freeVehicle()
    const { user } = renderApp({ route: `/admin/auctions/new?vehicleId=${car.id}`, userId: STAFF_ID })
    const before = useStore.getState().auctions.length

    const reserve = screen.getByLabelText(/底價/)
    await user.clear(reserve)
    await user.type(reserve, '100000')
    await user.click(screen.getByRole('button', { name: '建立拍賣' }))

    expect(screen.getByText('底價不得低於起標價')).toBeInTheDocument()
    expect(useStore.getState().auctions).toHaveLength(before)
  })

  it('沒選車輛時被擋下', async () => {
    const { user } = renderApp({ route: '/admin/auctions/new', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: '建立拍賣' }))
    expect(screen.getByText('請選擇車輛')).toBeInTheDocument()
  })

  it('立即成交價未高於底價時被擋下', async () => {
    const car = freeVehicle()
    const { user } = renderApp({ route: `/admin/auctions/new?vehicleId=${car.id}`, userId: STAFF_ID })

    await user.click(screen.getByRole('button', { name: /密封投標/ }))
    await user.type(screen.getByLabelText('立即成交價'), '800000')
    await user.click(screen.getByRole('button', { name: '建立拍賣' }))

    expect(screen.getByText('立即成交價必須高於底價')).toBeInTheDocument()
  })

  it('建立成功後拍賣為未開始，車輛轉為已排拍', async () => {
    const car = freeVehicle()
    const { user } = renderApp({ route: `/admin/auctions/new?vehicleId=${car.id}`, userId: STAFF_ID })
    const before = useStore.getState().auctions.length

    await user.click(screen.getByRole('button', { name: '建立拍賣' }))

    expect(useStore.getState().auctions).toHaveLength(before + 1)
    const created = useStore.getState().auctions.at(-1)!
    expect(created.status).toBe('未開始')
    expect(created.vehicleId).toBe(car.id)
    expect(useStore.getState().vehicles.find((v) => v.id === car.id)!.status).toBe('已排拍')
    expect(await screen.findByRole('heading', { name: '拍賣管理' })).toBeInTheDocument()
  })
})

describe('編輯既有拍賣', () => {
  it('未開始的拍賣可編輯，已綁定車輛一併列出並標註', () => {
    renderApp({ route: '/admin/auctions/a-up-scheduled/edit', userId: STAFF_ID })

    expect(screen.getByRole('heading', { name: '編輯拍賣' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '儲存變更' })).toBeInTheDocument()
    expect(screen.getByText('目前綁定於本拍賣')).toBeInTheDocument()
  })

  it('進行中的拍賣整頁唯讀，只有返回鈕', () => {
    renderApp({ route: '/admin/auctions/a-run-normal/edit', userId: STAFF_ID })

    expect(screen.getByText('此拍賣目前為「進行中」，無法編輯')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '前往監控頁' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '儲存變更' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/底價/)).toBeDisabled()
  })

  it('已成交的拍賣也是唯讀', () => {
    renderApp({ route: '/admin/auctions/a-deal-a/edit', userId: STAFF_ID })
    expect(screen.getByText('此拍賣目前為「已成交」，無法編輯')).toBeInTheDocument()
    expect(screen.getByLabelText(/起標價/)).toBeDisabled()
  })

  it('修改未開始拍賣的起標價後儲存生效', async () => {
    const { user } = renderApp({ route: '/admin/auctions/a-up-scheduled/edit', userId: STAFF_ID })

    const startPrice = screen.getByLabelText(/起標價/)
    await user.clear(startPrice)
    await user.type(startPrice, '333000')
    await user.click(screen.getByRole('button', { name: '儲存變更' }))

    expect(
      useStore.getState().auctions.find((a) => a.id === 'a-up-scheduled')!.startPrice,
    ).toBe(333_000)
  })
})
