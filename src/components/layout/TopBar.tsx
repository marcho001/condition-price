import { FastForward, LogOut, Pause, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useClock } from '@/clock/clockStore'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOGINABLE_USERS } from '@/data/users'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

export function TopBar() {
  const user = useCurrentUser()
  const login = useStore((s) => s.login)
  const logout = useStore((s) => s.logout)
  const speed = useClock((s) => s.speed)
  const now = useVirtualNow(1000)
  const navigate = useNavigate()

  if (!user) return null

  const switchTo = (id: string) => {
    const target = LOGINABLE_USERS.find((u) => u.id === id)!
    login(id)
    navigate(target.role === 'staff' ? '/admin/garage' : '/dealer/auctions')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-slate-900 px-4 text-white">
      <span className="font-semibold tracking-tight">車輛拍賣平台</span>

      <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs">
        <span className="tabular-nums">{formatDateTime(now)}</span>
        {speed === 0 && (
          <span className="flex items-center gap-1 rounded bg-amber-400 px-1.5 py-0.5 font-medium text-slate-900">
            <Pause className="size-3" /> 暫停
          </span>
        )}
        {speed > 1 && (
          <span className="flex items-center gap-1 rounded bg-emerald-400 px-1.5 py-0.5 font-medium text-slate-900">
            <FastForward className="size-3" /> x{speed}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          {/* shadcn base-nova 底層是 Base UI：用 render prop，不是 Radix 的 asChild */}
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
              />
            }
          >
            <UserCog className="size-4" />
            <span className="ml-1">
              {user.company ?? user.name}
              <span className="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-xs">
                {user.role === 'staff' ? '公司人員' : '二手車商'}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>切換角色</DropdownMenuLabel>
            {LOGINABLE_USERS.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => switchTo(u.id)}
                disabled={u.id === user.id}
              >
                {u.company ?? u.name}
                <span className="ml-2 text-xs text-slate-500">
                  {u.role === 'staff' ? '公司人員' : '二手車商'}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="mr-2 size-4" /> 登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
