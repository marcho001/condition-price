import axios from 'axios'
import { ElMessage } from 'element-plus'
import i18n from '@/i18n'
import router from '@/router'
import { clearLogin, getToken } from '@/utils/auth'
import { CODE } from './codes'

// 後端回應格式：HTTP 一律 200，body 為 { code, message, data }，code === '0000' 為成功。
// 成功時 resolve `data`；失敗時以後端的 message 跳 toast，並 reject ApiError。
// 1108（登入失效）在這裡統一處理；其餘需要額外動作的業務碼（例如回到列表）由呼叫端依 error.code 處理。
// 各 API 的路徑自帶服務的 context-path（例：/auction/dealer/...），baseURL 只放前綴。
//
// 自訂 config：
//   hideErrMsg: true  → 失敗時不跳 toast（失敗不影響操作、不需告知使用者時使用，例如字典）

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// Demo 沒有後端：一律走 mock adapter，資料來自兩站共用的拍賣核心（見 src/dealer/mock）。
// 維持動態載入，避免 mock → api → request 的循環引用
request.defaults.adapter = async (config) => {
  const { mockAdapter } = await import('@/mock')
  return mockAdapter(config)
}

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.token = token
  return config
})

request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === CODE.SUCCESS) return data

    if (code === CODE.NOT_LOGGED_IN) {
      handleSessionExpired(message)
    } else if (!response.config.hideErrMsg) {
      showError(message)
    }
    return Promise.reject(new ApiError(code, message))
  },
  (error) => {
    // 網路異常、逾時、HTTP 非 2xx
    if (!error.config?.hideErrMsg) showError()
    return Promise.reject(new ApiError(null, error.message))
  },
)

// 錯誤提示通則（規格 4.3）：後端有訊息以後端為主，否則用預設文案
function showError(message) {
  ElMessage.error(message || i18n.global.t('common.sysError'))
}

// 登入失效：清除登入資訊並回到登入頁，登入後回到原頁面。
// 頁面上常同時有多支 API，只處理第一支，避免重複跳 toast
function handleSessionExpired(message) {
  if (!getToken()) return
  clearLogin()
  showError(message)
  router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
}

export default request
