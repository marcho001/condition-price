import { cn } from '@/lib/utils'
import type { Grade, InteriorGrade } from '@/types'

/** 事故車 R 與低評級用警示色，高評級用中性色 */
const TONE: Record<Grade, string> = {
  S: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '5': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '4.5': 'bg-sky-100 text-sky-800 border-sky-200',
  '4': 'bg-sky-100 text-sky-800 border-sky-200',
  '3.5': 'bg-slate-100 text-slate-700 border-slate-200',
  '3': 'bg-slate-100 text-slate-700 border-slate-200',
  '2': 'bg-amber-100 text-amber-800 border-amber-200',
  R: 'bg-rose-100 text-rose-800 border-rose-200',
}

export function GradeBadge({
  grade,
  interiorGrade,
  className,
}: {
  grade: Grade
  interiorGrade?: InteriorGrade
  className?: string
}) {
  return (
    <span
      title={grade === 'R' ? '事故車' : `車體評級 ${grade}`}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        TONE[grade],
        className,
      )}
    >
      {grade}
      {interiorGrade && <span className="font-normal opacity-70">/ {interiorGrade}</span>}
    </span>
  )
}
