import type { EngineEvent } from '@/engine/events'
import { highestBid } from '@/engine/rules'
import { formatJPY } from '@/lib/money'
import type {
  AppNotification,
  Auction,
  EngineData,
  NotificationType,
  User,
  Vehicle,
} from '@/types'

export function eventsToNotifications(args: {
  events: EngineEvent[]
  data: EngineData
  users: User[]
  now: number
  nextId: () => string
}): AppNotification[] {
  const { events, data, users, now, nextId } = args
  const out: AppNotification[] = []
  const staffIds = users.filter((u) => u.role === 'staff').map((u) => u.id)

  const push = (
    userId: string,
    type: NotificationType,
    auctionId: string,
    title: string,
    body: string,
  ) => {
    out.push({ id: nextId(), userId, type, auctionId, title, body, at: now, read: false })
  }

  for (const event of events) {
    const auction = data.auctions.find((a) => a.id === event.auctionId)
    if (!auction) continue
    const vehicle = data.vehicles.find((v) => v.id === auction.vehicleId)
    if (!vehicle) continue

    const label = carLabel(vehicle)
    const bidders = [
      ...new Set(data.bids.filter((b) => b.auctionId === auction.id).map((b) => b.dealerId)),
    ]
    const watchers = data.watches
      .filter((w) => w.auctionId === auction.id)
      .map((w) => w.dealerId)
    const interested = [...new Set([...bidders, ...watchers])]

    switch (event.type) {
      case 'STARTED':
        for (const id of watchers) {
          push(id, 'WATCHED_STARTED', auction.id, '關注的拍賣已開標', `${label} 已開始競價。`)
        }
        break

      case 'NEW_BID':
        for (const id of watchers.filter((w) => w !== event.dealerId)) {
          push(
            id,
            'WATCHED_NEW_BID',
            auction.id,
            '關注的拍賣有新出價',
            `${label} 出現新出價 ${formatJPY(event.amount)}。`,
          )
        }
        break

      case 'OUTBID':
        push(
          event.dealerId,
          'OUTBID',
          auction.id,
          '您的出價已被超越',
          event.reason === 'proxy_exhausted'
            ? `${label} 的競價已達您設定的代理出價上限，若要繼續請重新設定。`
            : `${label} 已有更高出價，目前最高 ${formatJPY(
                currentPrice(data, auction) ?? auction.startPrice,
              )}。`,
        )
        break

      case 'EXTENDED':
        for (const id of interested) {
          push(
            id,
            'EXTENDED',
            auction.id,
            '結標時間已延長',
            `${label} 因結標前有新出價，結標時間延長 ${Math.round(
              event.extendedMs / 60_000,
            )} 分鐘。`,
          )
        }
        break

      case 'ENDING_SOON':
        for (const id of interested) {
          push(id, 'ENDING_SOON', auction.id, '拍賣即將結標', `${label} 即將結標，請確認您的出價。`)
        }
        break

      case 'CLOSED_DEAL':
        push(
          event.dealerId,
          'WON',
          auction.id,
          '恭喜得標',
          `您已以 ${formatJPY(event.amount)} 得標 ${label}。`,
        )
        for (const id of bidders.filter((b) => b !== event.dealerId)) {
          push(id, 'LOST', auction.id, '未得標', `${label} 已由其他車商得標。`)
        }
        for (const id of staffIds) {
          push(
            id,
            'AUCTION_CLOSED',
            auction.id,
            '拍賣已成交',
            `${label} 以 ${formatJPY(event.amount)} 成交。`,
          )
        }
        break

      case 'CLOSED_PASSED':
        for (const id of bidders) {
          push(id, 'LOST', auction.id, '拍賣已結束', `${label} 未成交。`)
        }
        for (const id of staffIds) {
          push(
            id,
            'AUCTION_CLOSED',
            auction.id,
            '拍賣已流標',
            `${label} 流標，原因：${event.reason}。`,
          )
        }
        break

      case 'NEGOTIATION_INVITE':
        push(
          event.dealerId,
          'NEGOTIATION_INVITE',
          auction.id,
          '議價邀請',
          `${label} 您的出價未達底價，加價至 ${formatJPY(
            event.amount,
          )} 即可成交，請於 24 小時內決定。`,
        )
        break

      // 刻意不帶 withdrawReason —— 理由涉及借款人資料，只有公司人員在監控頁看得到
      case 'WITHDRAWN':
        for (const id of interested) {
          push(id, 'WITHDRAWN', auction.id, '拍賣已下架', `${label} 已下架，本次拍賣中止。`)
        }
        break

      case 'NO_BID_ALERT':
        for (const id of staffIds) {
          push(
            id,
            'NO_BID_ALERT',
            auction.id,
            '上架 2 天無人出價',
            `${label} 已上架 2 天仍無人出價。`,
          )
        }
        break

      case 'ENDING_BELOW_RESERVE': {
        const top = currentPrice(data, auction) ?? 0
        for (const id of staffIds) {
          push(
            id,
            'ENDING_BELOW_RESERVE',
            auction.id,
            '即將結標未達底價',
            `${label} 即將結標，目前最高價距底價尚差 ${formatJPY(auction.reservePrice - top)}。`,
          )
        }
        break
      }
    }
  }

  return out
}

function carLabel(v: Vehicle): string {
  return `${v.brand} ${v.model} ${v.year}`
}

function currentPrice(data: EngineData, auction: Auction): number | null {
  return highestBid(data.bids.filter((b) => b.auctionId === auction.id))?.amount ?? null
}
