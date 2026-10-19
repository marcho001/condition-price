import { computed, toValue } from 'vue'
import { splitDuration } from '@/utils/format'
// Demo：以共用的伺服器時間（含時間快轉）取代本機時鐘，每秒更新一次
import { serverNow } from '../../shared/store.js'

// 剩餘時間少於此值時顯示「締切間近」橘色樣式（規格 5.1：少於 24 小時）
const ENDING_SOON_MS = 24 * 60 * 60 * 1000

/**
 * 倒數到拍賣截止時刻。正式站以本機時間計算；Demo 改用 serverNow，讓時間快轉一併生效。截止判定仍以伺服器為準（規格 1.1）
 * @param {import('vue').MaybeRefOrGetter<string | undefined>} endTime API 的 endAt（帶時區的 ISO 時間）；沒有時視為已截止
 */
export function useCountdown(endTime) {
  const remainingMs = computed(() => {
    const end = toValue(endTime)
    return end ? Math.max(0, new Date(end).getTime() - serverNow.value) : 0
  })
  const parts = computed(() => splitDuration(remainingMs.value))
  const isClosed = computed(() => remainingMs.value === 0)
  const isEndingSoon = computed(() => !isClosed.value && remainingMs.value < ENDING_SOON_MS)

  return { parts, isClosed, isEndingSoon }
}
