import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'

/** Demo 不做真上傳：照片由 seed 決定，可整組重抽或單張刪除 */
export function PhotoGrid({
  seeds,
  onChange,
}: {
  seeds: number[]
  onChange: (next: number[]) => void
}) {
  const regenerate = () => {
    onChange(Array.from({ length: 6 }, () => Math.floor(Math.random() * 99_999) + 1))
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {seeds.map((seed, i) => (
          <div key={`${seed}-${i}`} className="group relative">
            <VehiclePhoto seed={seed} alt={`照片 ${i + 1}`} className="aspect-[4/3] rounded" />
            <button
              type="button"
              onClick={() => onChange(seeds.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded bg-slate-900/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`刪除照片 ${i + 1}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={regenerate}>
          <RefreshCw className="mr-1 size-3" /> 重新產生照片
        </Button>
        <span className="text-xs text-slate-500">
          Demo 不提供上傳，照片由假圖服務產生。共 {seeds.length} 張。
        </span>
      </div>
    </div>
  )
}
