import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { cn } from '@/lib/utils'
import type { Vehicle } from '@/types'

const STATUS_TONE: Record<Vehicle['status'], string> = {
  在庫: 'bg-slate-100 text-slate-700',
  已排拍: 'bg-sky-100 text-sky-800',
  拍賣中: 'bg-emerald-100 text-emerald-800',
  已售出: 'bg-blue-100 text-blue-800',
  已下架: 'bg-slate-100 text-slate-500 line-through',
}

export function VehicleCard({
  vehicle,
  actions,
}: {
  vehicle: Vehicle
  actions?: ReactNode
}) {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0">
      <VehiclePhoto
        seed={vehicle.photoSeeds[0]}
        alt={`${vehicle.brand} ${vehicle.model}`}
        className="aspect-[4/3]"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-medium leading-tight">
            {vehicle.brand} {vehicle.model}
            <span className="ml-1.5 text-sm tabular-nums text-slate-500">{vehicle.year}</span>
          </p>
          <span
            className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs', STATUS_TONE[vehicle.status])}
          >
            {vehicle.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />
          <span className="tabular-nums">{vehicle.mileage.toLocaleString('en-US')} km</span>
          <span>{vehicle.bodyType}</span>
        </div>

        <p className="font-mono text-xs text-slate-400">{vehicle.orderNo}</p>

        {actions && <div className="mt-auto flex gap-2 pt-2">{actions}</div>}
      </div>
    </Card>
  )
}
