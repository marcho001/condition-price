// 拍賣相關的業務規則（規格 二、6.2）
import { ROUND_TYPE } from '@/api/auction'

export function isExtraRound(auction) {
  return auction.roundType === ROUND_TYPE.EXTRA
}

// 列表卡片與詳細頁的 API 格式不同：卡片的車輛欄位攤平在第一層、出價為 myBidAmount；
// 詳細頁的車輛欄位包在 vehicle 內、出價為 myBid { amount, bidTime }。
// 出價彈窗兩邊都會用到，透過下面兩個函式取值，不必在意來源。

/** 車輛欄位 */
export function vehicleOf(auction) {
  return auction.vehicle ?? auction
}

/** 本輪自己的出價金額；未出價為 null */
export function myBidAmountOf(auction) {
  return auction.myBid?.amount ?? auction.myBidAmount ?? null
}

/**
 * 出價金額檢查，回傳錯誤文案的 i18n key；通過則回傳 null
 * 第一輪：≥ 1 円；加價輪：必須「高於」起標價
 */
export function validateBidAmount(amount, auction) {
  if (amount === null) return 'bid.errRequired'
  if (isExtraRound(auction)) return amount > auction.startPrice ? null : 'bid.errFloor'
  return amount >= 1 ? null : 'bid.errZero'
}
