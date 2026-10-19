// 通知中心（知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml）
import request from './request'

/** 通知類型：五類，於發送當下寫入（規格 8.1.1） */
export const NOTICE_TYPE = {
  LISTED: 1, // 上架通知
  EXTRA_ROUND: 2, // 加價拍賣通知
  DEADLINE: 3, // 拍賣即將到期通知
  WON: 4, // 得標通知
  LOST: 5, // 未得標通知
}

/**
 * 通知列表（新到舊）。notifyType 與 keyword 為 AND
 * @param {{ notifyType?: number, keyword?: string, pageNo: number, pageSize: number }} data
 * @returns {Promise<{ records: object[], total: number }>}
 */
export function getNoticeList(data) {
  return request.post('/auction/dealer/notification/list', data)
}

/** @returns {Promise<{ unreadCount: number }>} */
export function getUnreadCount() {
  return request.post('/auction/dealer/notification/unread-count')
}

/**
 * 標記已讀；不存在或已讀的 id 後端直接略過
 * @param {{ ids: number[] }} data
 */
export function markNoticeRead(data) {
  return request.post('/auction/dealer/notification/read', data)
}

/** @param {{ ids: number[] }} data 1–100 筆 */
export function deleteNotices(data) {
  return request.post('/auction/dealer/notification/delete', data)
}
