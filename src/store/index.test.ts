import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '@/store/index'
import { DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import { currentPrice } from '@/store/selectors'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

beforeEach(() => {
  localStorage.clear()
  useStore.getState().reset(NOW)
})

const state = () => useStore.getState()
const auctionById = (id: string) => state().auctions.find((a) => a.id === id)!

describe('reset 與登入', () => {
  it('reset 載入 seed 資料', () => {
    expect(state().auctions).toHaveLength(15)
    expect(state().vehicles).toHaveLength(27)
    expect(state().notifications.length).toBeGreaterThan(0)
  })

  it('reset 會清掉登入狀態', () => {
    state().login(DEALER_A_ID)
    state().reset(NOW)
    expect(state().currentUserId).toBeNull()
  })

  it('login 與 logout', () => {
    state().login(STAFF_ID)
    expect(state().currentUserId).toBe(STAFF_ID)
    state().logout()
    expect(state().currentUserId).toBeNull()
  })
})

describe('submitBid', () => {
  it('成功出價後價格上升', () => {
    const before = currentPrice(state(), 'a-run-normal')!
    const r = state().submitBid({
      auctionId: 'a-run-normal',
      dealerId: DEALER_A_ID,
      amount: before + 10_000,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(currentPrice(state(), 'a-run-normal')).toBeGreaterThan(before)
  })

  it('金額不合法時回傳錯誤且不改變資料', () => {
    const before = state().bids.length
    const r = state().submitBid({
      auctionId: 'a-run-normal',
      dealerId: DEALER_A_ID,
      amount: 1,
      now: NOW,
    })
    expect(r.ok).toBe(false)
    expect(state().bids).toHaveLength(before)
  })

  it('出價會產生通知給被超越者', () => {
    const price = currentPrice(state(), 'a-run-normal')!
    const leader = state()
      .bids.filter((b) => b.auctionId === 'a-run-normal')
      .reduce((best, b) => (b.amount > best.amount ? b : best)).dealerId
    const other = leader === DEALER_A_ID ? DEALER_B_ID : DEALER_A_ID
    const before = state().notifications.length
    state().submitBid({
      auctionId: 'a-run-normal',
      dealerId: other,
      amount: price + 10_000,
      now: NOW,
    })
    expect(state().notifications.length).toBeGreaterThan(before)
    expect(state().notifications.some((n) => n.userId === leader && n.type === 'OUTBID')).toBe(true)
  })

  it('連續出價產生的 id 都不重複', () => {
    for (let i = 0; i < 5; i++) {
      const price = currentPrice(state(), 'a-run-normal')!
      state().submitBid({
        auctionId: 'a-run-normal',
        dealerId: i % 2 === 0 ? DEALER_A_ID : DEALER_B_ID,
        amount: price + 10_000,
        now: NOW + i * 1_000,
      })
    }
    const ids = state().bids.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('通知 id 也不與出價 id 相撞', () => {
    const price = currentPrice(state(), 'a-run-normal')!
    state().submitBid({
      auctionId: 'a-run-normal',
      dealerId: DEALER_A_ID,
      amount: price + 10_000,
      now: NOW,
    })
    const all = [...state().bids.map((b) => b.id), ...state().notifications.map((n) => n.id)]
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('advance', () => {
  it('剛 reset 後立刻 advance 不產生新通知', () => {
    const before = state().notifications.length
    state().advance(NOW)
    expect(state().notifications).toHaveLength(before)
  })

  it('快轉 1 小時會結束即將結標的拍賣並產生通知', () => {
    const before = state().notifications.length
    state().advance(NOW + 3_600_000)
    expect(state().notifications.length).toBeGreaterThan(before)
    expect(auctionById('a-run-ending-soon').status).not.toBe('進行中')
  })

  it('重複 advance 同一個時間不重複產生通知', () => {
    state().advance(NOW + 3_600_000)
    const after = state().notifications.length
    state().advance(NOW + 3_600_000)
    expect(state().notifications).toHaveLength(after)
  })
})

describe('關注', () => {
  it('toggleWatch 可加可移除', () => {
    const id = state().auctions[0].id
    const has = () => state().watches.some((w) => w.auctionId === id && w.dealerId === DEALER_B_ID)
    const initial = has()
    state().toggleWatch({ auctionId: id, dealerId: DEALER_B_ID })
    expect(has()).toBe(!initial)
    state().toggleWatch({ auctionId: id, dealerId: DEALER_B_ID })
    expect(has()).toBe(initial)
  })
})

describe('議價', () => {
  it('議價對象接受後成交', () => {
    const a = auctionById('a-nego-a')
    const r = state().acceptNegotiationAs({
      auctionId: a.id,
      dealerId: a.negotiation!.dealerId,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(auctionById('a-nego-a').status).toBe('已成交')
  })

  it('公司人員接受最高價後成交金額為最高出價', () => {
    const top = currentPrice(state(), 'a-nego-a')!
    state().acceptHighest({ auctionId: 'a-nego-a', now: NOW })
    expect(auctionById('a-nego-a').deal!.amount).toBe(top)
  })

  it('調降底價至最高價之下立即成交', () => {
    const top = currentPrice(state(), 'a-nego-a')!
    const r = state().adjustReservePrice({
      auctionId: 'a-nego-a',
      reservePrice: top - 10_000,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(auctionById('a-nego-a').status).toBe('已成交')
  })
})

describe('forceStatus（Demo 控制台用）', () => {
  it('start 讓未開始的拍賣立刻開標', () => {
    const r = state().forceStatus({ auctionId: 'a-up-scheduled', to: 'start', now: NOW })
    expect(r).toEqual({ ok: true })
    expect(auctionById('a-up-scheduled').status).toBe('進行中')
  })

  it('close 讓進行中的拍賣立刻依規則結標', () => {
    // a-run-extended 的最高價為底價的 1.04 倍，依規則應成交
    state().forceStatus({ auctionId: 'a-run-extended', to: 'close', now: NOW })
    expect(auctionById('a-run-extended').status).toBe('已成交')
  })

  it('pass 強制流標並把車輛退回在庫', () => {
    state().forceStatus({ auctionId: 'a-run-normal', to: 'pass', now: NOW })
    const a = auctionById('a-run-normal')
    expect(a.status).toBe('已流標')
    expect(state().vehicles.find((v) => v.id === a.vehicleId)!.status).toBe('在庫')
  })

  it('negotiate 強制進入議價', () => {
    state().forceStatus({ auctionId: 'a-run-normal', to: 'negotiate', now: NOW })
    const a = auctionById('a-run-normal')
    expect(a.status).toBe('議價中')
    expect(a.negotiation).toBeDefined()
  })

  it('沒有出價的拍賣不能強制進入議價', () => {
    state().forceStatus({ auctionId: 'a-up-scheduled', to: 'start', now: NOW })
    const r = state().forceStatus({ auctionId: 'a-up-scheduled', to: 'negotiate', now: NOW })
    expect(r.ok).toBe(false)
  })

  it('已開始的拍賣不能再強制開標', () => {
    const r = state().forceStatus({ auctionId: 'a-run-normal', to: 'start', now: NOW })
    expect(r).toEqual({ ok: false, error: '只有未開始的拍賣可以強制開標' })
  })
})

describe('saveAuction', () => {
  it('不能編輯非未開始的拍賣', () => {
    const a = auctionById('a-run-normal')
    const r = state().saveAuction({ ...a, startPrice: 1 })
    expect(r).toEqual({ ok: false, error: '只有未開始的拍賣可以編輯' })
  })

  it('底價低於起標價被拒', () => {
    const a = auctionById('a-up-scheduled')
    const r = state().saveAuction({ ...a, startPrice: 900_000, reservePrice: 800_000 })
    expect(r).toEqual({ ok: false, error: '底價不得低於起標價' })
  })

  it('結標時間早於開始時間被拒', () => {
    const a = auctionById('a-up-scheduled')
    const r = state().saveAuction({ ...a, endAt: a.startAt - 1 })
    expect(r).toEqual({ ok: false, error: '結標時間必須晚於開始時間' })
  })

  it('建立新拍賣會把車輛轉為已排拍', () => {
    const free = state().vehicles.find((v) => v.status === '在庫')!
    const r = state().saveAuction({
      id: 'a-new',
      vehicleId: free.id,
      type: 'SCHEDULED',
      status: '未開始',
      startAt: NOW + 3_600_000,
      endAt: NOW + 3_600_000 + 86_400_000,
      originalEndAt: NOW + 3_600_000 + 86_400_000,
      startPrice: 500_000,
      reservePrice: 900_000,
      reserveApproved: true,
      stepMode: 'auto',
      extendedMs: 0,
      emittedKeys: [],
      createdAt: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(state().auctions).toHaveLength(16)
    expect(state().vehicles.find((v) => v.id === free.id)!.status).toBe('已排拍')
  })
})

describe('通知讀取狀態', () => {
  it('markRead 只影響指定那一則', () => {
    const target = state().notifications.find((n) => !n.read)!
    state().markRead(target.id)
    expect(state().notifications.find((n) => n.id === target.id)!.read).toBe(true)
  })

  it('markAllRead 只影響該使用者', () => {
    state().markAllRead(DEALER_A_ID)
    expect(state().notifications.filter((n) => n.userId === DEALER_A_ID && !n.read)).toHaveLength(0)
    expect(state().notifications.some((n) => n.userId !== DEALER_A_ID)).toBe(true)
  })

  it('pushNotification 加入一則新通知並自動配 id', () => {
    const before = state().notifications.length
    state().pushNotification({
      userId: DEALER_A_ID,
      type: 'OUTBID',
      auctionId: 'a-run-normal',
      title: '測試',
      body: '手動推送',
      at: NOW,
      read: false,
    })
    expect(state().notifications).toHaveLength(before + 1)
    expect(state().notifications.at(-1)!.id).toBeTruthy()
  })
})
