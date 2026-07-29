import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export type FilterSpec<T> = { [K in keyof T]: 'string' | 'number' | 'array' }

/**
 * 把篩選條件放在 URL query：可分享連結、上一頁能回到原本的篩選、重整不會遺失。
 * 陣列用逗號分隔，數字自動轉型。
 */
export function useFilterParams<T extends Record<string, unknown>>(
  spec: FilterSpec<T>,
): [Partial<T>, (patch: Partial<T>) => void, () => void] {
  const [params, setParams] = useSearchParams()

  const value = useMemo(() => {
    const out: Record<string, unknown> = {}
    for (const [key, kind] of Object.entries(spec)) {
      const raw = params.get(key)
      if (raw === null || raw === '') continue
      if (kind === 'array') out[key] = raw.split(',').filter(Boolean)
      else if (kind === 'number') {
        const n = Number(raw)
        if (Number.isFinite(n)) out[key] = n
      } else out[key] = raw
    }
    return out as Partial<T>
    // spec 是模組層級常數，不需要進依賴陣列
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const patch = useCallback(
    (next: Partial<T>) => {
      const merged = new URLSearchParams(params)
      for (const [key, v] of Object.entries(next)) {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          merged.delete(key)
        } else {
          merged.set(key, Array.isArray(v) ? v.join(',') : String(v))
        }
      }
      setParams(merged, { replace: true })
    },
    [params, setParams],
  )

  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return [value, patch, clear]
}
