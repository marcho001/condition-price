// 登入／登出（知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml）
import request from './request'

/**
 * 登入
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ token: string, dealerName: string }>}
 */
export function login(data) {
  return request.post('/auction/dealer/auth/login', data)
}

/** token 已失效時後端同樣回成功 */
export function logout() {
  return request.post('/auction/dealer/auth/logout')
}
