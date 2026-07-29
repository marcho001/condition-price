import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { formatJPY } from '@/lib/money'
import type { Vehicle } from '@/types'

export function SpecTable({
  vehicle,
  showInternal,
}: {
  vehicle: Vehicle
  showInternal: boolean
}) {
  const rows: Array<[string, ReactNode]> = [
    ['訂單號', vehicle.orderNo],
    ['廠牌 / 車型', `${vehicle.brand} ${vehicle.model}`],
    ['年份', vehicle.year],
    ['里程', `${vehicle.mileage.toLocaleString('en-US')} km`],
    ['車牌', vehicle.plate],
    ['車身號碼', vehicle.vin],
    ['排氣量', `${vehicle.displacement.toLocaleString('en-US')} cc`],
    ['燃料', vehicle.fuel],
    ['變速箱', vehicle.transmission],
    ['驅動方式', vehicle.drive],
    ['車型分類', vehicle.bodyType],
    ['顏色', vehicle.color],
    ['座位數', `${vehicle.seats} 人`],
    ['車況評級', <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />],
  ]

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8rem_1fr] gap-4 px-4 py-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
        {showInternal && (
          <div className="grid grid-cols-[8rem_1fr] gap-4 bg-slate-50 px-4 py-2">
            <dt className="flex items-center gap-1 text-slate-500">
              <Lock className="size-3" /> 貸款餘額
            </dt>
            <dd className="font-medium tabular-nums">{formatJPY(vehicle.loanBalance)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
