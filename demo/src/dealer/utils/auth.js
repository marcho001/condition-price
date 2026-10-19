// 登入資訊的存取。沿用 xstar-web-pc 的做法：token 存在瀏覽器、每次請求放在 `token` header。
// 用 localStorage 而非 sessionStorage：廠商常從 Email／SMS 的連結開新分頁進站，sessionStorage 不跨分頁會被要求重新登入。
const TOKEN_KEY = 'token'
const DEALER_NAME_KEY = 'dealerName'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getDealerName() {
  return localStorage.getItem(DEALER_NAME_KEY) ?? ''
}

export function saveLogin({ token, dealerName }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(DEALER_NAME_KEY, dealerName)
}

export function clearLogin() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(DEALER_NAME_KEY)
}
