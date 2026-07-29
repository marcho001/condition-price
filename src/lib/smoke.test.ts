import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('工具鏈', () => {
  it('cn 會合併並去除衝突的 tailwind class', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    const hidden: string | false = false
    expect(cn('text-red-500', hidden)).toBe('text-red-500')
  })
})
