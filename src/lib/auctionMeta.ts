import type { AuctionStatus, AuctionType } from '@/types'

export const TYPE_LABEL: Record<AuctionType, string> = {
  SCHEDULED: '定時開標',
  LIVE: '即時同步拍',
  SEALED: '密封投標',
}

export const TYPE_HINT: Record<AuctionType, string> = {
  SCHEDULED: '掛數天，期間可隨時出價，看得到目前最高價，結標前有新出價會自動延長 3 分鐘',
  LIVE: '短時間集中競價，每次出價把剩餘時間重設為 15 秒，無人加價即落槌',
  SEALED: '期限內只能投一次，過程中看不到其他人的出價，可設立即成交價',
}

/** 列表排序用：需要留意的排在最前面 */
export const STATUS_ORDER: Record<AuctionStatus, number> = {
  進行中: 0,
  議價中: 1,
  未開始: 2,
  已成交: 3,
  已流標: 4,
  已撤標: 5,
}
