import type { ReactNode } from 'react'

export function StatRow({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>
}) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{item.value}</dd>
          {item.hint && <p className="mt-0.5 text-xs text-slate-400">{item.hint}</p>}
        </div>
      ))}
    </dl>
  )
}
