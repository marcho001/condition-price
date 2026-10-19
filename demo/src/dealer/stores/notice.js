import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUnreadCount } from '@/api/notice'

// 導覽列「お知らせ」的未讀數 badge；通知已讀或刪除後由通知中心呼叫 refreshUnread() 同步
export const useNoticeStore = defineStore('notice', () => {
  const unreadCount = ref(0)

  async function refreshUnread() {
    const data = await getUnreadCount()
    unreadCount.value = data.unreadCount
  }

  return { unreadCount, refreshUnread }
})
