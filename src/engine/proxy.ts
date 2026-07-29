import { bidStepFor } from '@/lib/money'
import { highestBid } from '@/engine/rules'
import type { Auction, Bid, ProxyBid } from '@/types'

/** 參賽者：能自動往上加價到 ceiling 為止的人 */
type Participant = { dealerId: string; ceiling: number; order: number }

/**
 * 解析代理出價。
 *
 * 刻意先用 (上限, 設定時間) 解析出勝者與成交價，再產生出價紀錄，
 * 而不是讓兩方代理逐級互頂 —— 逐級互頂會讓「級距的奇偶」決定誰贏，
 * 上限相同時反而可能由較晚設定的人勝出。
 *
 * 成交價 = min(勝者上限, 次高上限 + 一級距)，且必須達到目前價加一級距，
 * 否則視為所有代理上限都不足，不產生出價。
 *
 * 不修改傳入的陣列，只回傳新增的出價與受影響的車商。
 */
export function resolveProxyBids(args: {
  auction: Auction
  bids: Bid[]
  proxies: ProxyBid[]
  now: number
  nextId: () => string
}): { newBids: Bid[]; exhaustedDealerIds: string[]; outbidDealerIds: string[] } {
  const { auction, now, nextId } = args

  const actives = args.proxies.filter((p) => p.auctionId === auction.id && p.active)
  if (actives.length === 0) {
    return { newBids: [], exhaustedDealerIds: [], outbidDealerIds: [] }
  }

  const auctionBids = args.bids.filter((b) => b.auctionId === auction.id)
  const top = highestBid(auctionBids)
  const currentPrice = top ? top.amount : null
  const required =
    currentPrice === null
      ? auction.startPrice
      : currentPrice + bidStepFor(currentPrice, auction.stepMode, auction.fixedStep)

  const participants: Participant[] = actives.map((p) => ({
    dealerId: p.dealerId,
    ceiling: p.maxAmount,
    order: p.createdAt,
  }))

  // 目前領先者若沒有代理，就以他已出的金額為天花板，且視為最早進場
  const leaderHasProxy = top ? actives.some((p) => p.dealerId === top.dealerId) : false
  if (top && !leaderHasProxy) {
    participants.push({
      dealerId: top.dealerId,
      ceiling: top.amount,
      order: Number.NEGATIVE_INFINITY,
    })
  }

  // 上限高者勝；上限相同則較早設定者勝
  participants.sort((a, b) => b.ceiling - a.ceiling || a.order - b.order)
  const winner = participants[0]
  const runnerUp = participants[1]

  const settle = runnerUp
    ? Math.min(
        winner.ceiling,
        runnerUp.ceiling + bidStepFor(runnerUp.ceiling, auction.stepMode, auction.fixedStep),
      )
    : Math.min(winner.ceiling, required)

  // 勝者也湊不到一個完整級距 → 沒有人能出價，全部代理視為上限用盡
  if (settle < required) {
    return {
      newBids: [],
      exhaustedDealerIds: actives
        .filter((p) => p.dealerId !== top?.dealerId)
        .map((p) => p.dealerId),
      outbidDealerIds: [],
    }
  }

  // 勝者本來就領先：只有在次高的上限真的能超越目前價時才需要回應，
  // 否則沒有人在威脅他，不該自我加價
  if (top && winner.dealerId === top.dealerId) {
    const threatened = runnerUp !== undefined && runnerUp.ceiling >= required
    if (!threatened || settle <= top.amount) {
      return { newBids: [], exhaustedDealerIds: [], outbidDealerIds: [] }
    }
  }

  const newBids: Bid[] = []
  const outbid = new Set<string>()
  const place = (dealerId: string, amount: number) => {
    if (top && dealerId !== top.dealerId) outbid.add(top.dealerId)
    const previous = newBids.at(-1)
    if (previous && previous.dealerId !== dealerId) outbid.add(previous.dealerId)
    newBids.push({
      id: nextId(),
      auctionId: auction.id,
      dealerId,
      amount,
      at: now,
      kind: 'proxy',
    })
  }

  // 次高若也是代理，先讓他把價格推到自己的上限，出價紀錄才看得出競價過程
  const runnerUpIsProxy = runnerUp && actives.some((p) => p.dealerId === runnerUp.dealerId)
  if (runnerUpIsProxy && runnerUp.ceiling >= required && runnerUp.ceiling < settle) {
    place(runnerUp.dealerId, runnerUp.ceiling)
  }

  place(winner.dealerId, settle)

  const exhausted = actives
    .filter((p) => p.dealerId !== winner.dealerId && p.maxAmount <= settle)
    .map((p) => p.dealerId)

  outbid.delete(winner.dealerId)

  return { newBids, exhaustedDealerIds: exhausted, outbidDealerIds: [...outbid] }
}
