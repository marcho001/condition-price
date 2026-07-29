import { Bell, Car, Gavel, PanelLeftClose, PanelLeftOpen, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import { unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

const COLLAPSE_KEY = 'auction-demo:nav-collapsed'

type Item = { to: string; label: string; icon: typeof Car; badge?: number }

export function SideNav() {
  const user = useCurrentUser()
  const store = useStore()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  // 視窗窄於 1024px 自動收合
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => {
      if (mq.matches) setCollapsed(true)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  if (!user) return null

  const items: Item[] =
    user.role === 'staff'
      ? [
          {
            to: '/admin/garage',
            label: '車庫管理',
            icon: Car,
            badge: store.vehicles.filter((v) => v.status === '在庫').length,
          },
          {
            to: '/admin/auctions',
            label: '拍賣管理',
            icon: Gavel,
            badge: store.auctions.filter((a) => a.status === '進行中').length,
          },
        ]
      : [
          {
            to: '/dealer/auctions',
            label: '拍賣列表',
            icon: Gavel,
            badge: store.auctions.filter((a) => a.status === '進行中').length,
          },
          {
            to: '/dealer/watchlist',
            label: '關注清單',
            icon: Star,
            badge: store.watches.filter((w) => w.dealerId === user.id).length,
          },
          {
            to: '/dealer/notifications',
            label: '通知',
            icon: Bell,
            badge: unreadCount(store.notifications, user.id),
          },
        ]

  return (
    <nav
      className={cn(
        'flex shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-2 transition-[width]',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {items.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
              isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs tabular-nums text-slate-700">
                  {badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
      >
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!collapsed && <span>收合選單</span>}
      </button>
    </nav>
  )
}
