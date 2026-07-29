import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useStore } from '@/store/index'
import { notificationsFor, unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

const PREVIEW_COUNT = 8

export function NotificationBell() {
  const user = useCurrentUser()
  const store = useStore()
  const navigate = useNavigate()
  const now = useVirtualNow(30_000)
  const [open, setOpen] = useState(false)

  if (!user) return null

  const all = notificationsFor(store.notifications, user.id)
  const unread = unreadCount(store.notifications, user.id)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="relative text-white hover:bg-white/10 hover:text-white"
            aria-label={unread > 0 ? `通知，${unread} 則未讀` : '通知'}
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold tabular-nums text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <p className="text-sm font-semibold">通知</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => store.markAllRead(user.id)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              全部標為已讀
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            notifications={all.slice(0, PREVIEW_COUNT)}
            now={now}
            onSelect={(n) => {
              store.markRead(n.id)
              setOpen(false)
              navigate(
                user.role === 'staff'
                  ? `/admin/auctions/${n.auctionId}`
                  : `/dealer/auctions/${n.auctionId}`,
              )
            }}
          />
        </div>

        {user.role === 'dealer' && all.length > PREVIEW_COUNT && (
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/dealer/notifications')
              }}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              查看全部 {all.length} 則
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
