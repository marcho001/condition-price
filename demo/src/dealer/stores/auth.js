import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi } from '@/api/auth'
import { clearLogin, getDealerName, getToken, saveLogin } from '@/utils/auth'

// 登入狀態一律以 localStorage 為準（不另存一份在 store），
// 避免 token 被 API 攔截器清掉後兩邊不同步。
export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = () => Boolean(getToken())

  async function login(form) {
    saveLogin(await loginApi(form))
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      clearLogin()
    }
  }

  return { isLoggedIn, dealerName: getDealerName, login, logout }
})
