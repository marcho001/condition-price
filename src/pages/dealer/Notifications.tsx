import { useNavigate } from 'react-router'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { PageHeader } from '@/components/common/PageHeader'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { notificationsFor, unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function Notifications() {
  const user = useCurrentUser()!
  const store = useStore()
  const navigate = useNavigate()
  const now = useVirtualNow(30_000)

  const all = notificationsFor(store.notifications, user.id)
  const unread = unreadCount(store.notifications, user.id)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="通知"
        description={unread > 0 ? `${unread} 則未讀` : '全部已讀'}
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={() => store.markAllRead(user.id)}>
              全部標為已讀
            </Button>
          ) : undefined
        }
      />
      <NotificationList
        notifications={all}
        grouped
        now={now}
        emptyText="還沒有任何通知。關注拍賣或出價後，這裡會出現最新動態。"
        onSelect={(n) => {
          store.markRead(n.id)
          navigate(`/dealer/auctions/${n.auctionId}`)
        }}
      />
    </div>
  )
}
