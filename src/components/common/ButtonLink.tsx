import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 按鈕外觀的連結。
 *
 * 刻意不經過 Base UI 的 Button：
 * - `render={<Link/>}` 會警告 nativeButton 語意被破壞
 * - `nativeButton={false}` 雖然消掉警告，卻把 <a> 的 role 蓋成 "button"，
 *   對導覽元素來說語意更糟（螢幕閱讀器會唸成按鈕，也失去連結的操作提示）
 *
 * 導覽元素語意上就該是 <a role="link">，所以只借用 Button 的樣式變體。
 */
export function ButtonLink({
  to,
  className,
  variant,
  size,
  children,
  ...props
}: { to: string; className?: string } & VariantProps<typeof buttonVariants> &
  Omit<ComponentProps<typeof Link>, 'to' | 'className'>) {
  return (
    <Link to={to} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  )
}
