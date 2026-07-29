import { Bot } from 'lucide-react'
import { dealerLabel } from '@/data/users'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/index'
import { anonCodesFor, bidsOf } from '@/store/selectors'

/**
 * 出價紀錄時間軸。
 *
 * revealIdentity 預設關閉——全站都用匿名代號（提案 8.1：隱藏出價者身分
 * 以抑制買方聯合）。永遠不顯示代理出價的上限金額。
 */
export function BidHistory({
  auctionId,
  revealIdentity = false,
  highlightDealerId,
  hidden = false,
}: {
  auctionId: string
  revealIdentity?: boolean
  highlightDealerId?: string
  hidden?: boolean
}) {
  const store = useStore()
  const bids = [...bidsOf(store, auctionId)].sort((a, b) => b.at - a.at)
  const codes = anonCodesFor(bids)

  if (hidden) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        密封投標在結標前不揭露任何出價紀錄。目前共{' '}
        {new Set(bids.map((b) => b.dealerId)).size} 家投標。
      </p>
    )
  }

  if (bids.length === 0) {
    return <p className="text-sm text-slate-500">尚無出價紀錄。</p>
  }

  const top = bids.reduce((best, b) => (b.amount > best.amount ? b : best))

  return (
    <ol className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {bids.map((b) => {
        const isMine = highlightDealerId === b.dealerId
        return (
          <li
            key={b.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2 text-sm',
              b.id === top.id && 'bg-emerald-50',
              isMine && 'font-medium',
            )}
          >
            <span className="w-36 shrink-0 text-xs tabular-nums text-slate-500">
              {formatDateTime(b.at)}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {revealIdentity ? dealerLabel(b.dealerId) : codes.get(b.dealerId)}
              {isMine && <span className="ml-1 text-xs text-slate-500">（您）</span>}
            </span>
            {b.kind === 'proxy' && (
              <span
                title="由代理出價自動代出"
                className="flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
              >
                <Bot className="size-3" /> 代理
              </span>
            )}
            <span className="w-32 shrink-0 text-right tabular-nums">{formatJPY(b.amount)}</span>
          </li>
        )
      })}
    </ol>
  )
}
