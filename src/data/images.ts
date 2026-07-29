import { faker } from '@faker-js/faker'

let serviceDown = false

export function markPhotoServiceDown(): void {
  serviceDown = true
}

export function isPhotoServiceDown(): boolean {
  return serviceDown
}

/**
 * 車輛照片 URL。
 *
 * 刻意自行組 loremflickr URL，不呼叫 faker.image.urlLoremFlickr()
 * —— 該 helper 自 v10.1.0 起 deprecated，v11 將移除。
 *
 * lock 固定，因此同一個 seed 永遠取得同一張圖。
 */
export function photoUrl(seed: number, size: { w: number; h: number } = { w: 640, h: 480 }): string {
  return `https://loremflickr.com/${size.w}/${size.h}/car?lock=${seed}`
}

/** 離線 fallback：純本地 SVG data URI，不發任何請求 */
export function fallbackPhotoUrl(seed: number): string {
  faker.seed(seed)
  return faker.image.dataUri({ width: 640, height: 480 })
}

/** 元件應該呼叫這個：服務掛掉後就直接走 fallback，不再重試 */
export function resolvePhotoUrl(seed: number, size?: { w: number; h: number }): string {
  return serviceDown ? fallbackPhotoUrl(seed) : photoUrl(seed, size)
}
