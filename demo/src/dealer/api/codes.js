// 後端業務碼，依知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml
// 與 API/auction-award/auction-award-dealer-site.yaml。
// 失敗一律由 request 攔截器以後端的 message 跳 toast；需要額外處理的只有 1108 與 AUCTION_UNAVAILABLE_CODES
export const CODE = {
  SUCCESS: '0000',
  PARAM_ERROR: '1000',
  SYSTEM_ERROR: '9999',

  // 登入與帳號
  LOGIN_FAILED: '1104', // Email 或密碼錯誤
  LOGIN_LOCKED_NOW: '1105', // 本次錯誤剛好達 5 次而鎖定
  LOGIN_LOCKED: '1106', // 已鎖定後再次嘗試
  LOGIN_DISABLED: '1107', // 廠商已停用
  NOT_LOGGED_IN: '1108', // 未登入或登入已失效

  // 拍賣與出價
  AUCTION_NOT_FOUND: '1401', // 查無資料／無權限（含加價輪未受邀、已截止、已結清）
  BID_NOT_ELIGIBLE: '1402', // 無該輪出價資格
  BID_CLOSED: '1403', // 已截止
  BID_BELOW_FIRST_FLOOR: '1404', // 首輪未達 1 円
  BID_BELOW_EXTRA_FLOOR: '1405', // 加價輪未高於起標價
  BID_NOT_EXIST: '1406', // 放棄出價時本輪沒有出價
}

/** 拍賣已無法檢視或出價（不存在、無資格、已截止）：除了 toast，還要回到列表 */
export const AUCTION_UNAVAILABLE_CODES = [CODE.AUCTION_NOT_FOUND, CODE.BID_NOT_ELIGIBLE, CODE.BID_CLOSED]

export function isAuctionUnavailable(error) {
  return AUCTION_UNAVAILABLE_CODES.includes(error?.code)
}
