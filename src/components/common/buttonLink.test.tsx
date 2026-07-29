import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ButtonLink } from '@/components/common/ButtonLink'

function renderLink(props: Parameters<typeof ButtonLink>[0]) {
  return render(<MemoryRouter>{<ButtonLink {...props} />}</MemoryRouter>)
}

describe('ButtonLink', () => {
  it('渲染為原生連結，保留 role="link"', () => {
    renderLink({ to: '/x', children: '編輯' })
    const el = screen.getByRole('link', { name: '編輯' })
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/x')
  })

  it('不得被覆蓋成 role="button"（導覽元素的語意必須是連結）', () => {
    renderLink({ to: '/x', children: '編輯' })
    expect(screen.queryByRole('button', { name: '編輯' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '編輯' })).not.toHaveAttribute('role', 'button')
  })

  it('套用 Button 的樣式變體', () => {
    renderLink({ to: '/x', variant: 'outline', size: 'sm', children: '編輯' })
    const cls = screen.getByRole('link', { name: '編輯' }).className
    expect(cls).toContain('border-border')
    expect(cls).toContain('h-7')
  })

  it('額外的 className 會被合併', () => {
    renderLink({ to: '/x', className: 'flex-1', children: '編輯' })
    expect(screen.getByRole('link', { name: '編輯' }).className).toContain('flex-1')
  })
})
