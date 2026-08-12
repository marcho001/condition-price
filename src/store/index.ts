import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed } from '@/data/seed'
import { USERS } from '@/data/users'
import {
  acceptHighestBid,
  acceptNegotiation,
  adjustReserve,
  declineNegotiation,
  setDisposition,
  type ActionResult,
} from '@/engine/actions'
import { advanceAuctions } from '@/engine/advance'
import { placeBid } from '@/engine/bid'
import type { EngineEvent } from '@/engine/events'
import { eventsToNotifications } from '@/engine/notify'
import { NEGOTIATION_WINDOW_MS, highestBid } from '@/engine/rules'
import type { AppNotification, Auction, Disposition, EngineData, Vehicle } from '@/types'

export const STORAGE_KEY = 'auction-demo:store:v2'

export type ActionOutcome = { ok: true } | { ok: false; error: string }

const OK: ActionOutcome = { ok: true }
const fail = (error: string): ActionOutcome => ({ ok: false, error })

/** reset 時把 idSeq 推到這個值，避開 seed 自己用掉的 b0001 / n001 等前綴 */
const ID_SEQ_BASE = 100_000

type StoreState = EngineData & {
  notifications: AppNotification[]
  currentUserId: string | null
  idSeq: number

  login: (userId: string) => void
  logout: () => void
  advance: (now: number) => void
  submitBid: (args: {
    auctionId: string
    dealerId: string
    amount: number
    now: number
  }) => ActionOutcome
  toggleWatch: (args: { auctionId: string; dealerId: string }) => void
  saveVehicle: (vehicle: Vehicle) => void
  saveAuction: (auction: Auction) => ActionOutcome
  disposeVehicle: (args: { vehicleId: string; disposition: Disposition }) => ActionOutcome
  acceptNegotiationAs: (args: {
    auctionId: string
    dealerId: string
    now: number
  }) => ActionOutcome
  declineNegotiationAs: (args: {
    auctionId: string
    dealerId: string
    now: number
  }) => ActionOutcome
  acceptHighest: (args: { auctionId: string; now: number }) => ActionOutcome
  adjustReservePrice: (args: {
    auctionId: string
    reservePrice: number
    now: number
  }) => ActionOutcome
  markRead: (notificationId: string) => void
  markAllRead: (userId: string) => void
  pushNotification: (n: Omit<AppNotification, 'id'>) => void
  forceStatus: (args: {
    auctionId: string
    to: 'start' | 'close' | 'pass' | 'negotiate'
    now: number
  }) => ActionOutcome
  replaceAll: (next: { data: EngineData; notifications: AppNotification[] }) => void
  reset: (now: number) => void
}

function dataOf(s: StoreState): EngineData {
  return {
    vehicles: s.vehicles,
    auctions: s.auctions,
    bids: s.bids,
    watches: s.watches,
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** 以 idSeq 為基準的 id 產生器，commit 時把最終值寫回 */
      function idGen() {
        let n = get().idSeq
        return { next: () => `g${++n}`, final: () => n }
      }

      /** 把引擎結果與事件一次寫回 store */
      function commit(
        data: EngineData,
        events: EngineEvent[],
        now: number,
        gen: { next: () => string; final: () => number },
      ) {
        const notifications = eventsToNotifications({
          events,
          data,
          users: USERS,
          now,
          nextId: gen.next,
        })
        set((s) => ({
          ...data,
          idSeq: gen.final(),
          notifications: [...s.notifications, ...notifications],
        }))
      }

      function runAction(
        result: ActionResult,
        now: number,
        gen: ReturnType<typeof idGen>,
      ): ActionOutcome {
        if (result.error) return fail(result.error)
        commit(result.data, result.events, now, gen)
        return OK
      }

      function replaceAuction(s: StoreState, next: Auction): EngineData {
        return { ...dataOf(s), auctions: s.auctions.map((a) => (a.id === next.id ? next : a)) }
      }

      return {
        // 只為滿足型別；真正的初始化在 main.tsx 判斷 localStorage 沒資料時呼叫 reset
        ...buildSeed(0).data,
        notifications: [],
        currentUserId: null,
        idSeq: ID_SEQ_BASE,

        login: (userId) => set({ currentUserId: userId }),
        logout: () => set({ currentUserId: null }),

        advance: (now) => {
          const gen = idGen()
          const r = advanceAuctions(dataOf(get()), now)
          if (!r.changed) return
          commit(r.data, r.events, now, gen)
        },

        submitBid: ({ auctionId, dealerId, amount, now }) => {
          const gen = idGen()
          const r = placeBid(dataOf(get()), { auctionId, dealerId, amount, now, nextId: gen.next })
          if (r.error) return fail(r.error)
          commit(r.data, r.events, now, gen)
          return OK
        },

        toggleWatch: ({ auctionId, dealerId }) =>
          set((s) => {
            const exists = s.watches.some(
              (w) => w.auctionId === auctionId && w.dealerId === dealerId,
            )
            return {
              watches: exists
                ? s.watches.filter((w) => !(w.auctionId === auctionId && w.dealerId === dealerId))
                : [...s.watches, { auctionId, dealerId }],
            }
          }),

        saveVehicle: (vehicle) =>
          set((s) => ({
            vehicles: s.vehicles.some((v) => v.id === vehicle.id)
              ? s.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v))
              : [...s.vehicles, vehicle],
          })),

        saveAuction: (auction) => {
          const s = get()
          const existing = s.auctions.find((a) => a.id === auction.id)
          if (existing && existing.status !== '未開始') {
            return fail('只有未開始的拍賣可以編輯')
          }
          if (auction.endAt <= auction.startAt) return fail('結標時間必須晚於開始時間')
          if (auction.reservePrice < auction.startPrice) return fail('底價不得低於起標價')
          if (auction.buyNowPrice && auction.buyNowPrice <= auction.reservePrice) {
            return fail('立即成交價必須高於底價')
          }

          const isRelist = !existing && auction.relistedFromId !== undefined

          set((st) => ({
            auctions: existing
              ? st.auctions.map((a) => (a.id === auction.id ? auction : a))
              : [...st.auctions, auction],
            vehicles: st.vehicles.map((v) => {
              if (v.id !== auction.vehicleId) return v
              const next: Vehicle = v.status === '在庫' ? { ...v, status: '已排拍' } : { ...v }
              // 重掛的車不再帶著前一輪的處置標記
              if (isRelist) {
                next.relistCount = v.relistCount + 1
                next.disposition = undefined
              }
              return next
            }),
          }))
          return OK
        },

        disposeVehicle: (args) => {
          const gen = idGen()
          return runAction(setDisposition(dataOf(get()), args), Date.now(), gen)
        },

        acceptNegotiationAs: (args) => {
          const gen = idGen()
          return runAction(acceptNegotiation(dataOf(get()), args), args.now, gen)
        },

        declineNegotiationAs: (args) => {
          const gen = idGen()
          return runAction(declineNegotiation(dataOf(get()), args), args.now, gen)
        },

        acceptHighest: (args) => {
          const gen = idGen()
          return runAction(acceptHighestBid(dataOf(get()), args), args.now, gen)
        },

        adjustReservePrice: (args) => {
          const gen = idGen()
          return runAction(adjustReserve(dataOf(get()), args), args.now, gen)
        },

        markRead: (notificationId) =>
          set((s) => ({
            notifications: s.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n,
            ),
          })),

        markAllRead: (userId) =>
          set((s) => ({
            notifications: s.notifications.map((n) =>
              n.userId === userId ? { ...n, read: true } : n,
            ),
          })),

        pushNotification: (n) =>
          set((s) => ({
            idSeq: s.idSeq + 1,
            notifications: [...s.notifications, { ...n, id: `g${s.idSeq + 1}` }],
          })),

        forceStatus: ({ auctionId, to, now }) => {
          const s = get()
          const auction = s.auctions.find((a) => a.id === auctionId)
          if (!auction) return fail('找不到這筆拍賣')
          const gen = idGen()
          const bids = s.bids.filter((b) => b.auctionId === auctionId)

          // start 與 close 刻意繞回 advanceAuctions，讓強制操作走完全相同的規則，
          // 不會出現「手動結標的結果和自然結標不一致」
          if (to === 'start') {
            if (auction.status !== '未開始') return fail('只有未開始的拍賣可以強制開標')
            const shifted: Auction = {
              ...auction,
              startAt: now,
              endAt: Math.max(auction.endAt, now + 600_000),
            }
            const r = advanceAuctions(replaceAuction(s, shifted), now)
            commit(r.data, r.events, now, gen)
            return OK
          }

          if (to === 'close') {
            if (auction.status !== '進行中') return fail('只有進行中的拍賣可以強制結標')
            const r = advanceAuctions(replaceAuction(s, { ...auction, endAt: now }), now)
            commit(r.data, r.events, now, gen)
            return OK
          }

          if (to === 'pass') {
            if (auction.status !== '進行中' && auction.status !== '議價中') {
              return fail('只有進行中或議價中的拍賣可以強制流標')
            }
            const next: Auction = {
              ...auction,
              status: '已流標',
              endAt: Math.min(auction.endAt, now),
              closeReason: bids.length === 0 ? '無人出價' : '未達底價',
              negotiation: undefined,
            }
            commit(
              {
                ...replaceAuction(s, next),
                vehicles: s.vehicles.map((v) =>
                  v.id === auction.vehicleId ? { ...v, status: '在庫' } : v,
                ),
              },
              [{ type: 'CLOSED_PASSED', auctionId, reason: next.closeReason! }],
              now,
              gen,
            )
            return OK
          }

          if (auction.status !== '進行中') return fail('只有進行中的拍賣可以強制進入議價')
          const top = highestBid(bids)
          if (!top) return fail('這筆拍賣還沒有任何出價，無法進入議價')
          const next: Auction = {
            ...auction,
            status: '議價中',
            endAt: Math.min(auction.endAt, now),
            negotiation: {
              dealerId: top.dealerId,
              amount: Math.max(auction.reservePrice, top.amount + 10_000),
              deadline: now + NEGOTIATION_WINDOW_MS,
              declinedDealerIds: [],
            },
          }
          commit(
            replaceAuction(s, next),
            [
              {
                type: 'NEGOTIATION_INVITE',
                auctionId,
                dealerId: top.dealerId,
                amount: next.negotiation!.amount,
              },
            ],
            now,
            gen,
          )
          return OK
        },

        replaceAll: ({ data, notifications }) =>
          set({ ...data, notifications, idSeq: ID_SEQ_BASE }),

        reset: (now) => {
          const { data, notifications } = buildSeed(now)
          set({
            ...data,
            notifications,
            currentUserId: null,
            idSeq: ID_SEQ_BASE,
          })
        },
      }
    },
    {
      // 資料形狀隨 Phase 1 對齊改過（移除代理出價、撤標、即時同步拍），
      // 直接換 key 讓舊的 localStorage 失效，比寫 migration 乾淨
      name: STORAGE_KEY,
      version: 2,
      partialize: (s) => ({
        vehicles: s.vehicles,
        auctions: s.auctions,
        bids: s.bids,
        watches: s.watches,
        notifications: s.notifications,
        currentUserId: s.currentUserId,
        idSeq: s.idSeq,
      }),
    },
  ),
)
