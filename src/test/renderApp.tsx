import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { Router } from '@/router'
import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'

export const SEED_NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

/**
 * 掛起整個路由樹，用於頁面層級的 smoke test。
 * 每次呼叫都重置 store 與時鐘，測試之間互不影響。
 */
export function renderApp(options: { route?: string; userId?: string; now?: number } = {}) {
  const now = options.now ?? SEED_NOW
  localStorage.clear()
  // 讓 virtualNow() 剛好等於 now，倒數與結標判定才有決定性
  useClock.setState({ offsetMs: now - Date.now(), speed: 1 })
  useStore.getState().reset(now)
  if (options.userId) useStore.getState().login(options.userId)

  const utils = render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <Router />
    </MemoryRouter>,
  )
  return { ...utils, user: userEvent.setup() }
}
