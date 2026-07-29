import { cn } from '@/lib/utils'
import { formatJPY } from '@/lib/money'

const SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' } as const

export function Money({
  value,
  className,
  size = 'md',
}: {
  value: number
  className?: string
  size?: keyof typeof SIZES
}) {
  return (
    <span className={cn('font-semibold tabular-nums', SIZES[size], className)}>
      {formatJPY(value)}
    </span>
  )
}
