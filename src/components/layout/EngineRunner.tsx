import { useEffect } from 'react'
import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'

const TICK_MS = 250

/**
 * 全站唯一的時間驅動來源。只做兩件事：
 * 1. 推進虛擬時鐘（加速／暫停）
 * 2. 用當前虛擬時間呼叫 store.advance
 *
 * advance 在沒有任何變化時不會寫 store，所以這個 250ms 迴圈
 * 在拍賣沒事發生時完全不造成重繪或 localStorage 寫入。
 */
export function EngineRunner() {
  useEffect(() => {
    const id = setInterval(() => {
      useClock.getState().tick(TICK_MS)
      useStore.getState().advance(useClock.getState().virtualNow())
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
