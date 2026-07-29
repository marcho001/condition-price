import { useEffect, useState } from 'react'
import { useClock } from '@/clock/clockStore'

/**
 * 回傳當前虛擬時間，預設每 250ms 重算。
 * 倒數計時類元件請傳 1000，避免不必要的重繪。
 */
export function useVirtualNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => useClock.getState().virtualNow())

  useEffect(() => {
    const id = setInterval(() => setNow(useClock.getState().virtualNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
