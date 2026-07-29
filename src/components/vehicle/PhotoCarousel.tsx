import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { cn } from '@/lib/utils'

export function PhotoCarousel({ seeds, alt }: { seeds: number[]; alt: string }) {
  const [index, setIndex] = useState(0)
  if (seeds.length === 0) return null

  const go = (delta: number) => setIndex((i) => (i + delta + seeds.length) % seeds.length)

  return (
    <div>
      <div className="relative">
        <VehiclePhoto
          seed={seeds[index]}
          alt={`${alt} 照片 ${index + 1}`}
          className="aspect-[4/3] rounded-lg"
        />
        {seeds.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="上一張"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="下一張"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded bg-slate-900/70 px-2 py-0.5 text-xs tabular-nums text-white">
              {index + 1} / {seeds.length}
            </span>
          </>
        )}
      </div>

      {seeds.length > 1 && (
        <div className="mt-2 grid grid-cols-6 gap-2">
          {seeds.map((seed, i) => (
            <button
              key={`${seed}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`第 ${i + 1} 張`}
              aria-pressed={i === index}
            >
              <VehiclePhoto
                seed={seed}
                alt=""
                size={{ w: 160, h: 120 }}
                className={cn(
                  'aspect-[4/3] rounded ring-2 transition',
                  i === index ? 'ring-slate-900' : 'ring-transparent hover:ring-slate-300',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
