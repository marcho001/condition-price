import type { AuctionStatus, AuctionType } from '@/types'

export const TYPE_LABEL: Record<AuctionType, string> = {
  SCHEDULED: '定時開標',
  SEALED: '密封投標',
}

export const TYPE_HINT: Record<AuctionType, string> = {
  SCHEDULED: '掛 3–7 天，期間可隨時出價，看得到目前最高價，結標前有新出價會自動延長 3 分鐘',
  SEALED: '期限內只能投一次，過程中看不到其他人的出價，可設立即成交價',
}

/** Phase 1 §5.3 的選用建議，顯示在建立拍賣的畫面上 */
export const TYPE_WHEN: Record<AuctionType, string> = {
  SCHEDULED: '常見車款、有明確市場行情',
  SEALED: '稀有車／高價車／事故車／難估值，或同款車一次上架多台',
}

/** 列表排序用：需要留意的排在最前面 */
export const STATUS_ORDER: Record<AuctionStatus, number> = {
  進行中: 0,
  議價中: 1,
  未開始: 2,
  已成交: 3,
  已流標: 4,
}
