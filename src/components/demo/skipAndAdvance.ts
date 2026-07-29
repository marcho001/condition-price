import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'

/**
 * 快轉後立刻推進引擎，讓使用者馬上看到結果而不必等下一個 tick。
 * 回傳這次快轉觸發了幾則通知。
 */
export function skipAndAdvance(ms: number): number {
  const before = useStore.getState().notifications.length
  useClock.getState().skip(ms)
  useStore.getState().advance(useClock.getState().virtualNow())
  return useStore.getState().notifications.length - before
}
