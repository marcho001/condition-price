import { useEffect, useState } from 'react'
import {
  fallbackPhotoUrl,
  isPhotoServiceDown,
  markPhotoServiceDown,
  resolvePhotoUrl,
} from '@/data/images'
import { cn } from '@/lib/utils'

/**
 * 車輛照片。外部圖片服務失敗時改用本地 SVG，
 * 並記住服務不可用，之後所有照片直接走 fallback 不再重試。
 */
export function VehiclePhoto({
  seed,
  alt,
  className,
  size,
}: {
  seed: number
  alt: string
  className?: string
  size?: { w: number; h: number }
}) {
  const [src, setSrc] = useState(() => resolvePhotoUrl(seed, size))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSrc(resolvePhotoUrl(seed, size))
    setLoaded(false)
  }, [seed, size])

  return (
    <div className={cn('relative overflow-hidden bg-slate-200', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!isPhotoServiceDown()) markPhotoServiceDown()
          setSrc(fallbackPhotoUrl(seed))
          setLoaded(true)
        }}
        className={cn(
          'size-full object-cover transition-opacity',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}
