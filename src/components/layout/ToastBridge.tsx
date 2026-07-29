import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

/**
 * 只把「屬於當前使用者的新通知」跳成 toast。
 * 其他使用者的通知照樣存在 store，切換角色後在鈴鐺裡看得到。
 */
export function ToastBridge() {
  const user = useCurrentUser()
  const notifications = useStore((s) => s.notifications)
  const navigate = useNavigate()
  const seen = useRef<Set<string> | null>(null)
  const seenForUser = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      seen.current = null
      seenForUser.current = null
      return
    }

    // 第一次掛載或剛切換使用者時，把現有通知全部視為已看過，
    // 避免一進站就爆一堆 toast
    if (seen.current === null || seenForUser.current !== user.id) {
      seen.current = new Set(notifications.map((n) => n.id))
      seenForUser.current = user.id
      return
    }

    for (const n of notifications) {
      if (n.userId !== user.id || seen.current.has(n.id)) continue
      seen.current.add(n.id)
      toast(n.title, {
        description: n.body,
        action: {
          label: '查看',
          onClick: () =>
            navigate(
              user.role === 'staff'
                ? `/admin/auctions/${n.auctionId}`
                : `/dealer/auctions/${n.auctionId}`,
            ),
        },
      })
    }
  }, [notifications, user, navigate])

  return null
}
