import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type FilterField =
  | { kind: 'multi'; key: string; label: string; options: Array<{ value: string; label: string }> }
  | { kind: 'number'; key: string; label: string; placeholder?: string }
  | { kind: 'text'; key: string; label: string; placeholder?: string }
  | { kind: 'toggle'; key: string; label: string }

export function FilterBar({
  fields,
  value,
  onPatch,
  onClear,
  resultCount,
}: {
  fields: FilterField[]
  value: Record<string, unknown>
  onPatch: (patch: Record<string, unknown>) => void
  onClear: () => void
  resultCount: number
}) {
  const hasAny = fields.some((f) => {
    const v = value[f.key]
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''
  })

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        {fields.map((field) => {
          if (field.kind === 'multi') {
            const selected = (value[field.key] as string[] | undefined) ?? []
            return (
              <div key={field.key} className="min-w-0">
                <Label className="mb-1.5 block text-xs text-slate-500">{field.label}</Label>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((o) => {
                    const on = selected.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          onPatch({
                            [field.key]: on
                              ? selected.filter((s) => s !== o.value)
                              : [...selected, o.value],
                          })
                        }
                        className={cn(
                          'rounded border px-2 py-1 text-xs transition',
                          on
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                        )}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          }

          if (field.kind === 'toggle') {
            const on = value[field.key] === '1'
            return (
              <div key={field.key}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPatch({ [field.key]: on ? undefined : '1' })}
                  className={cn(
                    'rounded border px-3 py-1.5 text-xs transition',
                    on
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                  )}
                >
                  {field.label}
                </button>
              </div>
            )
          }

          return (
            <div key={field.key} className="w-36">
              <Label htmlFor={field.key} className="mb-1.5 block text-xs text-slate-500">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type={field.kind === 'number' ? 'number' : 'text'}
                placeholder={field.placeholder}
                value={(value[field.key] as string | number | undefined) ?? ''}
                onChange={(e) => onPatch({ [field.key]: e.target.value })}
                className="h-8"
              />
            </div>
          )
        })}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm tabular-nums text-slate-500">{resultCount} 筆</span>
          {hasAny && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-1 size-3" /> 清除篩選
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
