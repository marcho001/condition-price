import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { STAFF_ID } from '@/data/users'
import { useStore } from '@/store/index'
import { MIN_PHOTOS } from '@/store/selectors'

const CAR = () => useStore.getState().vehicles.find((v) => v.status === '在庫')!

describe('新增車輛', () => {
  it('五個區塊都在，內部資訊獨立標示', () => {
    renderApp({ route: '/admin/garage/new', userId: STAFF_ID })
    for (const t of ['基本資料', '規格', '車況', '照片', '內部資訊']) {
      expect(screen.getByText(t)).toBeInTheDocument()
    }
    expect(screen.getByText('此區塊不會顯示給車商。')).toBeInTheDocument()
  })

  it('必填欄位留空時顯示錯誤且不開預覽', async () => {
    const { user } = renderApp({ route: '/admin/garage/new', userId: STAFF_ID })
    await user.click(screen.getByRole('button', { name: '預覽並儲存' }))

    expect(screen.getByText('請填寫訂單號')).toBeInTheDocument()
    expect(screen.getByText('請填寫車牌')).toBeInTheDocument()
    expect(screen.getByText('請填寫車身號碼')).toBeInTheDocument()
    expect(screen.queryByText('將以此內容顯示給車商')).not.toBeInTheDocument()
  })

  it('切換廠牌時車型清單跟著換，且規格自動帶入該車型預設值', async () => {
    const { user } = renderApp({ route: '/admin/garage/new', userId: STAFF_ID })

    await user.selectOptions(screen.getByLabelText(/廠牌/), 'Suzuki')
    const modelSelect = screen.getByLabelText(/車型(?!分類)/) as HTMLSelectElement
    expect([...modelSelect.options].map((o) => o.value)).toEqual(['Jimny', 'Wagon R'])
    // Jimny 是輕自動車、MT、4WD、658cc
    expect((screen.getByLabelText(/排氣量/) as HTMLInputElement).value).toBe('658')
    expect((screen.getByLabelText(/變速箱/) as HTMLSelectElement).value).toBe('MT')
  })

  it('填完必填後開預覽，且預覽不含貸款餘額', async () => {
    const { user } = renderApp({ route: '/admin/garage/new', userId: STAFF_ID })

    await user.type(screen.getByLabelText(/訂單號/), 'ORD-2026-9001')
    await user.type(screen.getByLabelText(/車牌/), '品川 500 あ 11-22')
    await user.type(screen.getByLabelText(/車身號碼/), 'TESTVIN1234567890')
    await user.click(screen.getByRole('button', { name: '預覽並儲存' }))

    expect(await screen.findByText('將以此內容顯示給車商')).toBeInTheDocument()
    expect(screen.getByText('ORD-2026-9001')).toBeInTheDocument()
    expect(screen.queryByText('貸款餘額')).not.toBeInTheDocument()
  })

  it('確認儲存後車輛進入車庫', async () => {
    const { user } = renderApp({ route: '/admin/garage/new', userId: STAFF_ID })
    const before = useStore.getState().vehicles.length

    await user.type(screen.getByLabelText(/訂單號/), 'ORD-2026-9002')
    await user.type(screen.getByLabelText(/車牌/), '練馬 300 か 33-44')
    await user.type(screen.getByLabelText(/車身號碼/), 'TESTVIN0987654321')
    await user.click(screen.getByRole('button', { name: '預覽並儲存' }))
    await user.click(await screen.findByRole('button', { name: '確認儲存' }))

    expect(useStore.getState().vehicles).toHaveLength(before + 1)
    expect(
      useStore.getState().vehicles.some((v) => v.orderNo === 'ORD-2026-9002'),
    ).toBe(true)
    expect(await screen.findByRole('heading', { name: '車庫管理' })).toBeInTheDocument()
  })

  it('照片刪到 0 張時儲存被擋', async () => {
    const { user } = renderApp({ route: '/admin/garage/new', userId: STAFF_ID })

    await user.type(screen.getByLabelText(/訂單號/), 'ORD-2026-9003')
    await user.type(screen.getByLabelText(/車牌/), '横浜 400 さ 55-66')
    await user.type(screen.getByLabelText(/車身號碼/), 'TESTVIN1111111111')
    for (let i = MIN_PHOTOS; i >= 1; i--) {
      await user.click(screen.getByRole('button', { name: `刪除照片 ${i}` }))
    }
    await user.click(screen.getByRole('button', { name: '預覽並儲存' }))

    expect(screen.getByText('至少需要一張照片')).toBeInTheDocument()
  })
})

describe('編輯既有車輛', () => {
  it('欄位帶入原值', () => {
    const car = CAR()
    renderApp({ route: `/admin/garage/${car.id}/edit`, userId: STAFF_ID })

    expect(screen.getByRole('heading', { name: '編輯車輛' })).toBeInTheDocument()
    expect((screen.getByLabelText(/訂單號/) as HTMLInputElement).value).toBe(car.orderNo)
    expect((screen.getByLabelText(/車牌/) as HTMLInputElement).value).toBe(car.plate)
    expect((screen.getByLabelText(/貸款未償餘額/) as HTMLInputElement).value).toBe(
      String(car.loanBalance),
    )
  })

  it('修改後儲存會更新原車輛而非新增', async () => {
    const car = CAR()
    const { user } = renderApp({ route: `/admin/garage/${car.id}/edit`, userId: STAFF_ID })
    const before = useStore.getState().vehicles.length

    const mileage = screen.getByLabelText(/里程/)
    await user.clear(mileage)
    await user.type(mileage, '88000')
    await user.click(screen.getByRole('button', { name: '預覽並儲存' }))
    await user.click(await screen.findByRole('button', { name: '確認儲存' }))

    expect(useStore.getState().vehicles).toHaveLength(before)
    expect(useStore.getState().vehicles.find((v) => v.id === car.id)!.mileage).toBe(88_000)
  })
})
