import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = '返回列表',
}: {
  title: string
  description?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
