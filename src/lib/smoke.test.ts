import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/cn'

describe('工具鏈', () => {
  it('cn 會合併並去除衝突的 tailwind class', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', false && 'hidden')).toBe('text-red-500')
  })
})
