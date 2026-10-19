// 拍賣列表、詳細、出價（知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml）
// 與已得標（知識庫 API/auction-award/auction-award-dealer-site.yaml）
import request from './request'

/** 前端的三個列表；各自對應一支查詢 API，見 getListByScope */
export const LIST_SCOPE = {
  OPEN: 'OPEN',
  MY_BIDS: 'MY_BIDS',
  WON: 'WON',
}

/** 「新着出品／締切間近」快速篩選；未傳時回傳全部（規格 5.2） */
export const QUICK_FILTER = {
  NEW: 'NEW', // 開始日為今日或昨日（JST）
  ENDING_SOON: 'ENDING_SOON', // 結束日為今日或明日（JST）
}

/** 輪次類型 */
export const ROUND_TYPE = {
  FIRST: 1,
  EXTRA: 2,
}

/**
 * 列表的篩選條件與分頁，三個列表共用（已得標會忽略 quickFilter）。
 * 回傳 `{ records, total, pageNo, pageSize }`。
 *
 * @typedef {{
 *   vin?: string,                              車台番号，部分比對、不分大小寫（後端正規化）
 *   makeIds?: string[],                        廠牌，多選，符合其一即篩出
 *   carYearFrom?: number, carYearTo?: number,  年式起迄，含兩端，可只傳其一
 *   mileageFrom?: number, mileageTo?: number,  走行距離起迄（km），含兩端，可只傳其一
 *   quickFilter?: string,
 *   pageNo: number, pageSize: number,          pageSize 上限 50
 * }} ListQuery
 */

/**
 * 拍賣列表：本輪有出價資格、投標中的拍賣，剩餘時間最短優先
 * @param {ListQuery} data
 */
export function getAuctionList(data) {
  return request.post('/auction/dealer/auction/list', data)
}

/**
 * 我的拍賣：拍賣列表中本輪已有有效出價的那些
 * @param {ListQuery} data
 */
export function getMyAuctionList(data) {
  return request.post('/auction/dealer/auction/my/list', data)
}

/**
 * 已得標：得標、尚未結清的車，得標時間由近到遠
 * @param {ListQuery} data
 */
export function getWonList(data) {
  return request.post('/auction/dealer/auction/won/list', data)
}

const LIST_API_BY_SCOPE = {
  [LIST_SCOPE.OPEN]: getAuctionList,
  [LIST_SCOPE.MY_BIDS]: getMyAuctionList,
  [LIST_SCOPE.WON]: getWonList,
}

/**
 * 依列表呼叫對應的查詢 API
 * @param {string} scope LIST_SCOPE
 * @param {ListQuery} data
 */
export function getListByScope(scope, data) {
  return LIST_API_BY_SCOPE[scope](data)
}

/**
 * 投標中的車輛詳細。開始日未到、已截止、未受邀時後端回 CODE.AUCTION_NOT_FOUND
 * @param {number} roundId
 */
export function getAuctionDetail(roundId) {
  return request.post('/auction/dealer/auction/detail', { roundId })
}

/**
 * 已得標的車輛詳細。他家得標、已結清時後端回 CODE.AUCTION_NOT_FOUND
 * @param {number} roundId 已得標列表回傳的值
 */
export function getWonDetail(roundId) {
  return request.post('/auction/dealer/auction/won/detail', { roundId })
}

/**
 * 出價／修改出價（同一支，以最後一次送出的金額為準）
 * @param {{ roundId: number, amount: number }} data
 * @returns {Promise<{ amount: number, bidTime: string }>}
 */
export function submitBid(data) {
  return request.post('/auction/dealer/bid/submit', data)
}

/**
 * 放棄出價：將本輪出價初始化回未出價
 * @param {{ roundId: number }} data
 */
export function cancelBid(data) {
  return request.post('/auction/dealer/bid/cancel', data)
}
