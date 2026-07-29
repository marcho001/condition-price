import { useEffect, useState } from 'react'

export type ConsoleMode = 'hidden' | 'mini' | 'full'
export type Corner = 'br' | 'bl' | 'tr' | 'tl'

const MODE_KEY = 'auction-demo:console-mode'
const CORNER_KEY = 'auction-demo:console-corner'

export const CORNER_CLASS: Record<Corner, string> = {
  br: 'bottom-4 right-4',
  bl: 'bottom-4 left-4',
  tr: 'top-20 right-4',
  tl: 'top-20 left-4',
}

export const CORNER_LABEL: Record<Corner, string> = {
  br: '右下',
  bl: '左下',
  tr: '右上',
  tl: '左上',
}

export function useConsoleState() {
  const [mode, setMode] = useState<ConsoleMode>(
    () => (localStorage.getItem(MODE_KEY) as ConsoleMode | null) ?? 'mini',
  )
  const [corner, setCorner] = useState<Corner>(
    () => (localStorage.getItem(CORNER_KEY) as Corner | null) ?? 'br',
  )

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem(CORNER_KEY, corner)
  }, [corner])

  // 快捷鍵：` 切換 hidden ↔ full，Esc 收起
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target !== null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      if (e.key === '`') {
        e.preventDefault()
        setMode((m) => (m === 'full' ? 'hidden' : 'full'))
      } else if (e.key === 'Escape') {
        setMode((m) => (m === 'full' ? 'mini' : m))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { mode, setMode, corner, setCorner }
}
