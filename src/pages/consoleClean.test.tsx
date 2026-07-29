import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { DEALER_A_ID, STAFF_ID } from '@/data/users'

/**
 * 這些頁面用了「按鈕外觀的連結」。Base UI 的 Button 預設 nativeButton 為 true，
 * 若 render 出來不是原生 <button> 就會警告語意與 a11y 被破壞。
 * 這組測試把 console 乾淨度當成可回歸的驗收條件。
 */
const ROUTES: Array<{ route: string; userId: string; name: string }> = [
  { route: '/admin/garage', userId: STAFF_ID, name: '車庫列表' },
  { route: '/admin/auctions', userId: STAFF_ID, name: '拍賣管理' },
  { route: '/admin/auctions/a-up-scheduled', userId: STAFF_ID, name: '監控頁（未開始）' },
  { route: '/dealer/auctions', userId: DEALER_A_ID, name: '車商拍賣列表' },
  { route: '/dealer/auctions/a-run-normal', userId: DEALER_A_ID, name: '車商詳細頁' },
  { route: '/dealer/watchlist', userId: DEALER_A_ID, name: '關注清單' },
  { route: '/dealer/notifications', userId: DEALER_A_ID, name: '通知頁' },
]

let errorSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

function messages() {
  return [...errorSpy.mock.calls, ...warnSpy.mock.calls].map((c) =>
    c.map((x: unknown) => String(x)).join(' '),
  )
}

describe('頁面渲染不產生 console 警告', () => {
  for (const { route, userId, name } of ROUTES) {
    it(`${name} 沒有 Base UI 的 nativeButton 警告`, () => {
      renderApp({ route, userId })
      const offenders = messages().filter((m) => m.includes('nativeButton'))
      expect(offenders).toEqual([])
    })

    it(`${name} 沒有 React 的 key 警告`, () => {
      renderApp({ route, userId })
      const offenders = messages().filter((m) => m.includes('unique "key"'))
      expect(offenders).toEqual([])
    })
  }
})
