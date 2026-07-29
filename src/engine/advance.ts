import type { EngineEvent } from '@/engine/events'
import { resolveProxyBids } from '@/engine/proxy'
import {
  BELOW_RESERVE_LEAD_MS,
  ENDING_SOON_LEAD_MS,
  NEGOTIATION_WINDOW_MS,
  NO_BID_ALERT_MS,
  highestBid,
  resolveClose,
} from '@/engine/rules'
import type { Auction, AuctionStatus, Bid, EngineData, Vehicle } from '@/types'

const TERMINAL = new Set<AuctionStatus>(['已流標', '已成交', '已撤標'])

/**
 * 時間驅動的狀態機。對同一個 now 重複呼叫必須冪等：
 * 提醒類事件以 auction.emittedKeys 去重，且鍵含 endAt，
 * 這樣軟結標延長後會重新提醒一次。
 *
 * changed 為 false 時回傳原本的 data 物件參照，讓 store 能用 === 判斷
 * 要不要寫入，避免每 250ms 觸發 localStorage 寫入。
 */
export function advanceAuctions(
  data: EngineData,
  now: number,
  nextId: () => string,
): { data: EngineData; events: EngineEvent[]; changed: boolean } {
  const events: EngineEvent[] = []
  let changed = false

  let vehicles = data.vehicles
  let bids = data.bids
  const auctions: Auction[] = []

  for (const original of data.auctions) {
    let a = original
    if (TERMINAL.has(a.status)) {
      auctions.push(a)
      continue
    }

    const emit = (key: string, event: EngineEvent) => {
      if (a.emittedKeys.includes(key)) return
      a = { ...a, emittedKeys: [...a.emittedKeys, key] }
      events.push(event)
    }

    const setVehicle = (status: Vehicle['status']) => {
      vehicles = vehicles.map((v) => (v.id === a.vehicleId ? { ...v, status } : v))
    }

    const auctionBids = () => bids.filter((b: Bid) => b.auctionId === a.id)

    // 1. 開標
    if (a.status === '未開始' && now >= a.startAt) {
      a = { ...a, status: '進行中' }
      setVehicle('拍賣中')
      emit('STARTED', { type: 'STARTED', auctionId: a.id })

      if (a.type !== 'SEALED') {
        const r = resolveProxyBids({
          auction: a,
          bids: auctionBids(),
          proxies: data.proxies,
          now,
          nextId,
        })
        if (r.newBids.length > 0) {
          bids = [...bids, ...r.newBids]
          for (const b of r.newBids) {
            events.push({
              type: 'NEW_BID',
              auctionId: a.id,
              dealerId: b.dealerId,
              amount: b.amount,
            })
          }
        }
      }
    }

    // 2. 進行中的提醒。刻意放在結標之前，這樣一次快轉跨過整個拍賣時
    //    ENDING_SOON 仍會發出。
    if (a.status === '進行中') {
      const top = highestBid(auctionBids())

      // 用「已進入或已越過窗口」而非「還剩多久」，這樣一次快轉跨過整個拍賣時
      // 這些提醒仍會補發。emittedKeys 含 endAt，所以每個結標時間只發一次。
      if (now >= a.endAt - ENDING_SOON_LEAD_MS) {
        emit(`ENDING_SOON:${a.endAt}`, { type: 'ENDING_SOON', auctionId: a.id })
      }
      if (now >= a.endAt - BELOW_RESERVE_LEAD_MS && (top?.amount ?? 0) < a.reservePrice) {
        emit(`BELOW_RESERVE:${a.endAt}`, { type: 'ENDING_BELOW_RESERVE', auctionId: a.id })
      }
      if (!top && now - a.startAt >= NO_BID_ALERT_MS) {
        emit('NO_BID', { type: 'NO_BID_ALERT', auctionId: a.id })
      }
    }

    // 3. 結標
    if (a.status === '進行中' && now >= a.endAt) {
      const outcome = resolveClose(a, auctionBids())
      if (outcome.kind === 'deal') {
        a = {
          ...a,
          status: '已成交',
          deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: now },
        }
        setVehicle('已售出')
        events.push({
          type: 'CLOSED_DEAL',
          auctionId: a.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        })
      } else if (outcome.kind === 'negotiate') {
        a = {
          ...a,
          status: '議價中',
          negotiation: {
            dealerId: outcome.dealerId,
            amount: outcome.amount,
            deadline: now + NEGOTIATION_WINDOW_MS,
            declinedDealerIds: [],
          },
        }
        events.push({
          type: 'NEGOTIATION_INVITE',
          auctionId: a.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        })
      } else {
        a = { ...a, status: '已流標', closeReason: outcome.reason }
        setVehicle('在庫')
        events.push({ type: 'CLOSED_PASSED', auctionId: a.id, reason: outcome.reason })
      }
    }

    // 4. 議價期限到，依序換問下一位。用 while 而非 if——快轉數天時
    //    可能連續跳過多位車商的 24 小時期限，一次 tick 必須全部處理完。
    while (a.status === '議價中' && a.negotiation && now >= a.negotiation.deadline) {
      const declined = [...a.negotiation.declinedDealerIds, a.negotiation.dealerId]
      const outcome = resolveClose(a, auctionBids(), declined)
      if (outcome.kind === 'passed') {
        a = { ...a, status: '已流標', closeReason: outcome.reason, negotiation: undefined }
        setVehicle('在庫')
        events.push({ type: 'CLOSED_PASSED', auctionId: a.id, reason: outcome.reason })
      } else if (outcome.kind === 'negotiate') {
        a = {
          ...a,
          negotiation: {
            dealerId: outcome.dealerId,
            amount: outcome.amount,
            deadline: now + NEGOTIATION_WINDOW_MS,
            declinedDealerIds: declined,
          },
        }
        events.push({
          type: 'NEGOTIATION_INVITE',
          auctionId: a.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        })
      } else {
        a = {
          ...a,
          status: '已成交',
          deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: now },
          negotiation: undefined,
        }
        setVehicle('已售出')
        events.push({
          type: 'CLOSED_DEAL',
          auctionId: a.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        })
      }
    }

    if (a !== original) changed = true
    auctions.push(a)
  }

  if (!changed && bids === data.bids && vehicles === data.vehicles) {
    return { data, events: [], changed: false }
  }
  return { data: { ...data, vehicles, auctions, bids }, events, changed: true }
}
