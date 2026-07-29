import { create } from 'zustand'

export const SPEEDS = [0, 1, 10, 60] as const

const STORAGE_KEY = 'auction-demo:clock-offset'
const SAVE_THROTTLE_MS = 2_000

function loadOffset(): number {
  if (typeof localStorage === 'undefined') return 0
  const raw = localStorage.getItem(STORAGE_KEY)
  const n = raw === null ? 0 : Number(raw)
  return Number.isFinite(n) ? n : 0
}

let lastSaved = 0
function saveOffset(offsetMs: number, force = false) {
  if (typeof localStorage === 'undefined') return
  const realNow = Date.now()
  if (!force && realNow - lastSaved < SAVE_THROTTLE_MS) return
  lastSaved = realNow
  localStorage.setItem(STORAGE_KEY, String(Math.round(offsetMs)))
}

type ClockState = {
  offsetMs: number
  speed: number
  virtualNow: () => number
  skip: (ms: number) => void
  setSpeed: (speed: number) => void
  resetToReal: () => void
  tick: (realDeltaMs: number) => void
}

/**
 * 虛擬時鐘。刻意不走 zustand persist middleware —— tick 每 250ms 執行，
 * 走 persist 會每秒寫 4 次 localStorage。改為在 offset 變動時自行節流寫入。
 *
 * speed 不持久化，重整後一律回到 1x，避免關掉分頁後回來發現時間飛掉幾天。
 *
 * 暫停的實作是每次 tick 把 offset 往回扣掉經過的真實時間，
 * 這樣 virtualNow() 的公式 Date.now() + offsetMs 完全不必分支。
 */
export const useClock = create<ClockState>((set, get) => ({
  offsetMs: loadOffset(),
  speed: 1,

  virtualNow: () => Date.now() + get().offsetMs,

  skip: (ms) => {
    const offsetMs = get().offsetMs + ms
    set({ offsetMs })
    saveOffset(offsetMs, true)
  },

  setSpeed: (speed) => set({ speed }),

  resetToReal: () => {
    set({ offsetMs: 0, speed: 1 })
    saveOffset(0, true)
  },

  tick: (realDeltaMs) => {
    const { speed, offsetMs } = get()
    if (speed === 1) return
    const next = offsetMs + realDeltaMs * (speed - 1)
    set({ offsetMs: next })
    saveOffset(next)
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveOffset(useClock.getState().offsetMs, true))
}
