import { useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { USERS, dealerLabel } from '@/data/users'
import { useStore } from '@/store/index'
import type { NotificationType } from '@/types'

const PRESETS: Array<{ value: NotificationType; label: string; title: string; body: string }> = [
  { value: 'OUTBID', label: '出價被超越', title: '您的出價已被超越', body: '這筆拍賣已有更高出價，請確認是否加價。' },
  { value: 'ENDING_SOON', label: '即將結標', title: '拍賣即將結標', body: '這筆拍賣即將結標，請確認您的出價。' },
  { value: 'EXTENDED', label: '結標已延長', title: '結標時間已延長', body: '因結標前有新出價，結標時間延長 3 分鐘。' },
  { value: 'WON', label: '得標', title: '恭喜得標', body: '您已成功得標這筆拍賣。' },
  { value: 'LOST', label: '未得標', title: '未得標', body: '這筆拍賣已由其他車商得標。' },
  { value: 'NEGOTIATION_INVITE', label: '議價邀請', title: '議價邀請', body: '您的出價未達底價，加價後即可成交，請於 24 小時內決定。' },
  { value: 'WATCHED_NEW_BID', label: '關注的有新出價', title: '關注的拍賣有新出價', body: '您關注的拍賣出現新出價。' },
  { value: 'WATCHED_STARTED', label: '關注的已開標', title: '關注的拍賣已開標', body: '您關注的拍賣已開始競價。' },
  { value: 'NO_BID_ALERT', label: '無人出價（內部）', title: '上架 2 天無人出價', body: '此拍賣已上架 2 天仍無人出價。' },
  { value: 'ENDING_BELOW_RESERVE', label: '未達底價（內部）', title: '即將結標未達底價', body: '此拍賣即將結標，目前最高價仍未達底價。' },
  { value: 'AUCTION_CLOSED', label: '拍賣已結束（內部）', title: '拍賣已結束', body: '此拍賣已結標。' },
]

export function NotificationPusher() {
  const store = useStore()
  const [type, setType] = useState<NotificationType>('OUTBID')
  const [userId, setUserId] = useState(USERS[1].id)
  const [auctionId, setAuctionId] = useState(store.auctions[0]?.id ?? '')

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        推送通知
      </h3>

      <Label htmlFor="push-type" className="sr-only">
        通知類型
      </Label>
      <select
        id="push-type"
        value={type}
        onChange={(e) => setType(e.target.value as NotificationType)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {PRESETS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <Label htmlFor="push-user" className="sr-only">
        收件者
      </Label>
      <select
        id="push-user"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {dealerLabel(u.id)}
            {u.role === 'staff' ? '（公司人員）' : ''}
          </option>
        ))}
      </select>

      <Label htmlFor="push-auction" className="sr-only">
        關聯拍賣
      </Label>
      <select
        id="push-auction"
        value={auctionId}
        onChange={(e) => setAuctionId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {store.auctions.map((a) => {
          const v = store.vehicles.find((x) => x.id === a.vehicleId)
          return (
            <option key={a.id} value={a.id}>
              {v ? `${v.brand} ${v.model}` : a.id}
            </option>
          )
        })}
      </select>

      <Button
        size="sm"
        className="w-full"
        onClick={() => {
          const preset = PRESETS.find((t) => t.value === type)!
          store.pushNotification({
            userId,
            type,
            auctionId,
            title: preset.title,
            body: preset.body,
            at: useClock.getState().virtualNow(),
            read: false,
          })
          toast.success(`已推送通知給 ${dealerLabel(userId)}`)
        }}
      >
        立即推送
      </Button>
      <p className="mt-1.5 text-xs text-slate-500">
        推送給當前登入者會立刻跳 toast；推送給其他人則需切換角色後在鈴鐺裡查看。
      </p>
    </section>
  )
}
