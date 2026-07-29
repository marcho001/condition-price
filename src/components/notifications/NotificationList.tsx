import {
  AlertTriangle,
  Ban,
  Bell,
  Clock,
  Gavel,
  Handshake,
  Star,
  Timer,
  TrendingDown,
  Trophy,
  XCircle,
} from 'lucide-react'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/types'

const NOTIFICATION_ICON: Record<NotificationType, typeof Bell> = {
  OUTBID: TrendingDown,
  ENDING_SOON: Timer,
  EXTENDED: Clock,
  WON: Trophy,
  LOST: XCircle,
  NEGOTIATION_INVITE: Handshake,
  WATCHED_NEW_BID: Star,
  WATCHED_STARTED: Star,
  WITHDRAWN: Ban,
  NO_BID_ALERT: AlertTriangle,
  ENDING_BELOW_RESERVE: AlertTriangle,
  AUCTION_CLOSED: Gavel,
}

/** 需要立即反應的通知用強調色（提案 9.1：出價被超越是影響成交價最直接的一則） */
const URGENT: Set<NotificationType> = new Set([
  'OUTBID',
  'NEGOTIATION_INVITE',
  'ENDING_SOON',
  'WON',
])

export function NotificationList({
  notifications,
  onSelect,
  grouped = false,
  emptyText = '目前沒有通知。',
  now,
}: {
  notifications: AppNotification[]
  onSelect: (n: AppNotification) => void
  grouped?: boolean
  emptyText?: string
  now?: number
}) {
  if (notifications.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyText}</p>
  }

  if (!grouped) {
    return (
      <ul className="divide-y divide-slate-100">
        {notifications.map((n) => (
          <Item key={n.id} notification={n} onSelect={onSelect} />
        ))}
      </ul>
    )
  }

  const ref = now ?? Date.now()
  const groups: Array<[string, AppNotification[]]> = [
    ['今天', notifications.filter((n) => ref - n.at < 86_400_000)],
    ['本週', notifications.filter((n) => ref - n.at >= 86_400_000 && ref - n.at < 7 * 86_400_000)],
    ['更早', notifications.filter((n) => ref - n.at >= 7 * 86_400_000)],
  ]

  return (
    <div className="space-y-6">
      {groups
        .filter(([, list]) => list.length > 0)
        .map(([label, list]) => (
          <section key={label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {list.map((n) => (
                <Item key={n.id} notification={n} onSelect={onSelect} />
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

function Item({
  notification: n,
  onSelect,
}: {
  notification: AppNotification
  onSelect: (n: AppNotification) => void
}) {
  const Icon = NOTIFICATION_ICON[n.type]
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(n)}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
          !n.read && 'bg-sky-50/60',
        )}
      >
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            URGENT.has(n.type) ? 'text-rose-500' : 'text-slate-400',
          )}
        />
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm leading-tight', !n.read && 'font-semibold')}>
            {n.title}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{n.body}</span>
          <span className="mt-1 block text-xs tabular-nums text-slate-400">
            {formatDateTime(n.at)}
          </span>
        </span>
        {!n.read && (
          <span aria-label="未讀" className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" />
        )}
      </button>
    </li>
  )
}
