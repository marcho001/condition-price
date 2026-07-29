# 車輛拍賣平台純前端 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一個零後端、假資料、可完整走完拍賣流程的 React Demo，並附一個能手動觸發任何狀態改變與通知的浮動控制台。

**Architecture:** 一個虛擬時鐘（`Date.now() + offsetMs`，可加速）驅動一組**純函式引擎**（`advanceAuctions` / `placeBid`），引擎回傳新資料與事件陣列，事件再轉成通知寫入 store。所有頁面只讀 store、不含任何狀態轉換邏輯。倒數計時由元件自己的 1 秒 interval 處理，**不寫回 store**，避免每秒觸發 localStorage 寫入。

**Tech Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Router v7 · Zustand（persist）· @faker-js/faker v10 · Vitest

**Spec:** [`docs/superpowers/specs/2026-07-28-auction-demo-frontend-design.md`](../specs/2026-07-28-auction-demo-frontend-design.md)

## Global Constraints

- 幣別日圓，金額一律用 `formatJPY()` 輸出 `¥1,820,000` 格式，數字元素加 `tabular-nums` class
- 介面文字全部繁體中文；程式碼識別字全部英文
- **零網路 API 呼叫**。唯一的外部請求是 `loremflickr.com` 的圖片，且必須有 `onError` fallback
- 不呼叫 `faker.image.urlLoremFlickr()`（v10.1.0 起 deprecated），自行組 URL
- `faker.seed(20260728)` 固定種子
- 拍賣狀態只有這六個字串值：`'未開始' | '進行中' | '議價中' | '已流標' | '已成交' | '已撤標'`
- 車輛狀態只有這五個字串值：`'在庫' | '已排拍' | '拍賣中' | '已售出' | '已下架'`
- 引擎（`src/engine/**`）必須是純函式：不讀 `Date.now()`、不讀 store、不做 I/O。時間與 id 產生器一律由參數傳入
- 引擎對同一個 `now` 重複呼叫必須冪等（狀態相同、事件相同）
- 底價 `reservePrice`、貸款餘額 `loanBalance`、代理上限 `ProxyBid.maxAmount` 三者**永不出現在車商可見的 UI**
- Demo 控制台一律 `position: fixed` overlay，**不得使用 push 式 drawer**，頁面 layout 寬度不可因控制台開合而改變
- 只保證 ≥ 768px 桌機寬度的操作品質
- 每個 Task 結束時 `npx tsc --noEmit` 與 `npm test` 必須通過

---

## File Structure

| 檔案 | 責任 |
|---|---|
| `src/types.ts` | 全部資料型別，無邏輯 |
| `src/lib/money.ts` | 金額格式化、出價級距、合法出價計算 |
| `src/lib/time.ts` | 時間格式化、`datetime-local` 互轉 |
| `src/lib/cn.ts` | `clsx` + `tailwind-merge` |
| `src/engine/rules.ts` | 軟結標延長量、結標判定（純函式，無狀態） |
| `src/engine/proxy.ts` | 代理出價解析迴圈 |
| `src/engine/bid.ts` | `placeBid`：驗證 → 寫入 → 軟結標 → 代理解析 |
| `src/engine/advance.ts` | `advanceAuctions`：時間驅動的狀態轉換 + 事件產生 |
| `src/engine/notify.ts` | `EngineEvent[]` → `Notification[]` |
| `src/engine/withdraw.ts` | 撤標、議價決議（人為操作，非時間驅動） |
| `src/clock/clockStore.ts` | 虛擬時鐘 zustand store（不經 persist middleware） |
| `src/clock/clockPersist.ts` | offset 節流寫入 localStorage |
| `src/clock/useVirtualNow.ts` | 訂閱時鐘、回傳當前虛擬時間的 hook |
| `src/store/index.ts` | 主 zustand store + persist + `partialize` |
| `src/store/selectors.ts` | 衍生資料（含篩選、匿名代號、我的出價狀態） |
| `src/data/vehicleCatalog.ts` | 日本車款清單與規格區間 |
| `src/data/dealers.ts` | 6 家車商與 3 個登入帳號 |
| `src/data/images.ts` | 照片 URL 產生 + 離線 fallback 狀態 |
| `src/data/seed.ts` | `buildSeed(now)` 產生初始資料 |
| `src/data/scenarios.ts` | 6 組預設情境 |
| `src/components/layout/*` | AppShell · TopBar · SideNav · EngineRunner · ToastBridge |
| `src/components/vehicle/*` | VehiclePhoto · GradeBadge · SpecTable · VehicleCard |
| `src/components/auction/*` | StatusBadge · TypeBadge · Countdown · AuctionCard · BidHistory · BidPanel · ProxyBidPanel |
| `src/components/filters/*` | FilterBar 與各篩選欄位 |
| `src/components/notifications/*` | NotificationBell · NotificationList |
| `src/components/demo/*` | DemoConsole 與五個功能區塊 |
| `src/pages/**` | 頁面組裝，不含邏輯 |

---

## Task 1: 專案骨架與工具鏈

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/lib/cn.ts`
- Test: `src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `cn(...inputs: ClassValue[]): string`；可用的 `npm run dev` / `npm run build` / `npm test`；path alias `@/` → `src/`

- [ ] **Step 1: 用 Vite 建立骨架並安裝依賴**

在 worktree 根目錄執行（`.` 表示就地建立，不另開子目錄）：

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install zustand react-router @faker-js/faker clsx tailwind-merge lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest @types/node
```

若 `npm create vite` 因目錄非空而拒絕，改用 `npm create vite@latest . -- --template react-ts --overwrite`；`docs/` 與 `.git/` 不會被動到。

- [ ] **Step 2: 設定 Vite（Tailwind v4 plugin + path alias + vitest）**

`vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: 設定 tsconfig path alias**

在 `tsconfig.json` 的 `compilerOptions` 加入（若專案用 `tsconfig.app.json`，加在該檔）：

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 4: 加入 test script**

`package.json` 的 `scripts` 加入：

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: 設定 Tailwind v4 進入點**

把 `src/index.css` 整個檔案內容換成：

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", "Noto Sans TC", system-ui, sans-serif;
}

html, body, #root { height: 100%; }
body { @apply bg-slate-50 text-slate-900 antialiased; }
```

刪除 Vite 樣板產生的 `src/App.css`，並移除 `src/App.tsx` 對它的 import。

- [ ] **Step 6: 建立 `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: 寫一個 smoke test 確認測試環境與 alias 都通**

`src/lib/smoke.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/cn'

describe('工具鏈', () => {
  it('cn 會合併並去除衝突的 tailwind class', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-red-500', false && 'hidden')).toBe('text-red-500')
  })
})
```

- [ ] **Step 8: 執行測試，確認通過**

Run: `npm test`
Expected: 1 passed（若 alias 沒設好會出現 `Cannot find module '@/lib/cn'`）

- [ ] **Step 9: 讓 App.tsx 顯示一個可辨識的畫面**

`src/App.tsx`：

```tsx
export default function App() {
  return (
    <div className="grid min-h-full place-items-center">
      <p className="text-sm text-slate-500">車輛拍賣平台 Demo — 骨架就緒</p>
    </div>
  )
}
```

- [ ] **Step 10: 確認 dev server 與 typecheck 都通**

Run: `npm run typecheck && npm run build`
Expected: 兩者皆無錯誤

- [ ] **Step 11: 建立 .gitignore**

```
node_modules
dist
.DS_Store
.idea
*.local
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: 建立 Vite + React + TS + Tailwind v4 + Vitest 骨架"
```

---

## Task 2: 資料型別

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Consumes: 無
- Produces: 下列所有型別。後續每個 Task 都從 `@/types` import，欄位名稱不得改動。

- [ ] **Step 1: 寫下全部型別**

`src/types.ts` 完整內容：

```ts
export type Role = 'staff' | 'dealer'

export type User = {
  id: string
  role: Role
  name: string
  company?: string
  loginable: boolean
  canSeeReserve: boolean
}

export type Fuel = '汽油' | '柴油' | '油電' | '電動'
export type Transmission = 'AT' | 'MT' | 'CVT'
export type Drive = 'FF' | 'FR' | '4WD'
export type BodyType = '房車' | 'SUV' | '七人車' | '輕自動車' | '商用車'
export type Grade = 'S' | '5' | '4.5' | '4' | '3.5' | '3' | '2' | 'R'
export type InteriorGrade = 'A' | 'B' | 'C' | 'D'
export type VehicleStatus = '在庫' | '已排拍' | '拍賣中' | '已售出' | '已下架'

export type Vehicle = {
  id: string
  orderNo: string
  brand: string
  model: string
  year: number
  mileage: number
  plate: string
  vin: string
  displacement: number
  fuel: Fuel
  transmission: Transmission
  drive: Drive
  color: string
  seats: number
  bodyType: BodyType
  grade: Grade
  interiorGrade: InteriorGrade
  photoSeeds: number[]
  remarks: string
  loanBalance: number
  status: VehicleStatus
  createdAt: number
}

export type AuctionType = 'SCHEDULED' | 'LIVE' | 'SEALED'
export type AuctionStatus = '未開始' | '進行中' | '議價中' | '已流標' | '已成交' | '已撤標'
export type CloseReason = '無人出價' | '未達底價' | '議價失敗'
export type StepMode = 'auto' | 'fixed'

export type Negotiation = {
  dealerId: string
  amount: number
  deadline: number
  declinedDealerIds: string[]
}

export type Deal = {
  dealerId: string
  amount: number
  at: number
}

export type Auction = {
  id: string
  vehicleId: string
  type: AuctionType
  status: AuctionStatus
  startAt: number
  endAt: number
  originalEndAt: number
  startPrice: number
  reservePrice: number
  stepMode: StepMode
  fixedStep?: number
  buyNowPrice?: number
  extendedMs: number
  withdrawReason?: string
  withdrawnBy?: string
  closeReason?: CloseReason
  deal?: Deal
  negotiation?: Negotiation
  emittedKeys: string[]
  createdAt: number
}

export type Bid = {
  id: string
  auctionId: string
  dealerId: string
  amount: number
  at: number
  kind: 'manual' | 'proxy'
}

export type ProxyBid = {
  auctionId: string
  dealerId: string
  maxAmount: number
  active: boolean
  createdAt: number
}

export type Watch = {
  auctionId: string
  dealerId: string
}

export type NotificationType =
  | 'OUTBID'
  | 'ENDING_SOON'
  | 'EXTENDED'
  | 'WON'
  | 'LOST'
  | 'NEGOTIATION_INVITE'
  | 'WATCHED_NEW_BID'
  | 'WATCHED_STARTED'
  | 'WITHDRAWN'
  | 'NO_BID_ALERT'
  | 'ENDING_BELOW_RESERVE'
  | 'AUCTION_CLOSED'

export type AppNotification = {
  id: string
  userId: string
  type: NotificationType
  auctionId: string
  title: string
  body: string
  at: number
  read: boolean
}

/** 引擎讀寫的全部業務資料。刻意不含 users 與 notifications。 */
export type EngineData = {
  vehicles: Vehicle[]
  auctions: Auction[]
  bids: Bid[]
  proxies: ProxyBid[]
  watches: Watch[]
}
```

`AppNotification` 刻意不叫 `Notification`，避免與瀏覽器內建的 `Notification` 全域型別衝突。`Vehicle.photoSeeds` 存數字而非完整 URL，讓照片 URL 的組法可以單獨替換。

- [ ] **Step 2: 確認 typecheck 通過**

Run: `npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: 定義全部資料型別"
```

---

## Task 3: 金額與時間工具（TDD）

**Files:**
- Create: `src/lib/money.ts`, `src/lib/time.ts`
- Test: `src/lib/money.test.ts`, `src/lib/time.test.ts`

**Interfaces:**
- Consumes: `StepMode` from `@/types`
- Produces:
  - `formatJPY(n: number): string`
  - `bidStepFor(currentPrice: number, stepMode: StepMode, fixedStep?: number): number`
  - `nextValidBid(input: { startPrice: number; stepMode: StepMode; fixedStep?: number }, currentPrice: number | null): number`
  - `validateBidAmount(input: { startPrice: number; stepMode: StepMode; fixedStep?: number }, currentPrice: number | null, amount: number): { ok: true } | { ok: false; reason: string }`
  - `formatDuration(ms: number): string`
  - `formatDateTime(ms: number): string`
  - `toDateTimeLocal(ms: number): string`
  - `fromDateTimeLocal(value: string): number`

- [ ] **Step 1: 寫 money 的失敗測試**

`src/lib/money.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { bidStepFor, formatJPY, nextValidBid, validateBidAmount } from '@/lib/money'

const auto = { startPrice: 300_000, stepMode: 'auto' as const }

describe('formatJPY', () => {
  it('加上 ¥ 與千分位', () => {
    expect(formatJPY(1_820_000)).toBe('¥1,820,000')
    expect(formatJPY(0)).toBe('¥0')
  })
})

describe('bidStepFor auto 模式的邊界', () => {
  it('未滿 50 萬為 5,000', () => {
    expect(bidStepFor(0, 'auto')).toBe(5_000)
    expect(bidStepFor(499_999, 'auto')).toBe(5_000)
  })
  it('50 萬到未滿 200 萬為 10,000', () => {
    expect(bidStepFor(500_000, 'auto')).toBe(10_000)
    expect(bidStepFor(1_999_999, 'auto')).toBe(10_000)
  })
  it('200 萬以上為 50,000', () => {
    expect(bidStepFor(2_000_000, 'auto')).toBe(50_000)
    expect(bidStepFor(9_000_000, 'auto')).toBe(50_000)
  })
})

describe('bidStepFor fixed 模式', () => {
  it('忽略價格一律回傳 fixedStep', () => {
    expect(bidStepFor(100, 'fixed', 20_000)).toBe(20_000)
    expect(bidStepFor(5_000_000, 'fixed', 20_000)).toBe(20_000)
  })
  it('fixed 但沒給 fixedStep 時退回 auto', () => {
    expect(bidStepFor(600_000, 'fixed')).toBe(10_000)
  })
})

describe('nextValidBid', () => {
  it('無人出價時等於起標價', () => {
    expect(nextValidBid(auto, null)).toBe(300_000)
  })
  it('有人出價時為目前價加一級距', () => {
    expect(nextValidBid(auto, 300_000)).toBe(305_000)
    expect(nextValidBid(auto, 600_000)).toBe(610_000)
  })
  it('級距依目前價而非起標價決定', () => {
    expect(nextValidBid(auto, 2_000_000)).toBe(2_050_000)
  })
})

describe('validateBidAmount', () => {
  it('接受剛好等於合法出價的金額', () => {
    expect(validateBidAmount(auto, 300_000, 305_000)).toEqual({ ok: true })
  })
  it('接受更高且落在級距上的金額', () => {
    expect(validateBidAmount(auto, 300_000, 350_000)).toEqual({ ok: true })
  })
  it('拒絕低於合法出價的金額', () => {
    const r = validateBidAmount(auto, 300_000, 300_000)
    expect(r.ok).toBe(false)
  })
  it('拒絕不落在級距上的金額', () => {
    const r = validateBidAmount(auto, 300_000, 306_000)
    expect(r).toEqual({ ok: false, reason: '金額必須是 ¥5,000 的整數倍' })
  })
  it('拒絕非正整數', () => {
    expect(validateBidAmount(auto, null, 0).ok).toBe(false)
    expect(validateBidAmount(auto, null, 300_000.5).ok).toBe(false)
  })
})
```

「落在級距上」的定義是 `(amount - startPrice) % step === 0`，以起標價為基準而非 0，這樣起標價不是級距整數倍時規則仍然一致。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL，`Failed to resolve import "@/lib/money"`

- [ ] **Step 3: 實作 `src/lib/money.ts`**

```ts
import type { StepMode } from '@/types'

const AUTO_STEPS: ReadonlyArray<{ under: number; step: number }> = [
  { under: 500_000, step: 5_000 },
  { under: 2_000_000, step: 10_000 },
  { under: Number.POSITIVE_INFINITY, step: 50_000 },
]

export function formatJPY(n: number): string {
  return `¥${Math.round(n).toLocaleString('en-US')}`
}

export function bidStepFor(currentPrice: number, stepMode: StepMode, fixedStep?: number): number {
  if (stepMode === 'fixed' && fixedStep && fixedStep > 0) return fixedStep
  return AUTO_STEPS.find((s) => currentPrice < s.under)!.step
}

type StepInput = { startPrice: number; stepMode: StepMode; fixedStep?: number }

export function nextValidBid(input: StepInput, currentPrice: number | null): number {
  if (currentPrice === null) return input.startPrice
  return currentPrice + bidStepFor(currentPrice, input.stepMode, input.fixedStep)
}

export function validateBidAmount(
  input: StepInput,
  currentPrice: number | null,
  amount: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, reason: '請輸入正整數金額' }
  }
  const min = nextValidBid(input, currentPrice)
  if (amount < min) {
    return { ok: false, reason: `至少需出 ${formatJPY(min)}` }
  }
  const step = bidStepFor(currentPrice ?? input.startPrice, input.stepMode, input.fixedStep)
  if ((amount - input.startPrice) % step !== 0) {
    return { ok: false, reason: `金額必須是 ${formatJPY(step)} 的整數倍` }
  }
  return { ok: true }
}

export function priceGapRatio(reservePrice: number, highest: number): number {
  if (reservePrice <= 0) return 0
  return (reservePrice - highest) / reservePrice
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/money.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 寫 time 的失敗測試**

`src/lib/time.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { formatDuration, fromDateTimeLocal, toDateTimeLocal } from '@/lib/time'

describe('formatDuration', () => {
  it('未滿 1 小時顯示 mm:ss', () => {
    expect(formatDuration(42_000)).toBe('00:42')
    expect(formatDuration(4 * 60_000 + 12_000)).toBe('04:12')
  })
  it('未滿 1 天顯示 hh:mm:ss', () => {
    expect(formatDuration(3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe('03:04:05')
  })
  it('超過 1 天加上天數', () => {
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000)).toBe('2 天 03:00:00')
  })
  it('負數或零一律顯示 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(-5_000)).toBe('00:00')
  })
})

describe('datetime-local 互轉', () => {
  it('轉出去再轉回來得到同一分鐘', () => {
    const ms = new Date(2026, 6, 28, 14, 30, 0, 0).getTime()
    const local = toDateTimeLocal(ms)
    expect(local).toBe('2026-07-28T14:30')
    expect(fromDateTimeLocal(local)).toBe(ms)
  })
})
```

- [ ] **Step 6: 執行測試確認失敗**

Run: `npx vitest run src/lib/time.test.ts`
Expected: FAIL，無法解析 `@/lib/time`

- [ ] **Step 7: 實作 `src/lib/time.ts`**

```ts
const pad = (n: number) => String(n).padStart(2, '0')

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days} 天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toDateTimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDateTimeLocal(value: string): number {
  const [date, time] = value.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime()
}
```

`formatDateTime` 與 `toDateTimeLocal` 都走本地時區，與 `<input type="datetime-local">` 的行為一致。

- [ ] **Step 8: 執行全部測試確認通過**

Run: `npm test`
Expected: 全部 PASS（money + time + smoke）

- [ ] **Step 9: Commit**

```bash
git add src/lib
git commit -m "feat: 金額級距與時間格式化工具"
```

---

## Task 4: 引擎規則層 —— 軟結標與結標判定（TDD）

**Files:**
- Create: `src/engine/rules.ts`
- Test: `src/engine/rules.test.ts`

**Interfaces:**
- Consumes: `Auction`, `AuctionType`, `Bid` from `@/types`；`priceGapRatio` from `@/lib/money`
- Produces:
  - `SOFT_CLOSE: Record<AuctionType, { windowMs: number; extendMs: number; capMs: number } | null>`
  - `NEGOTIATION_THRESHOLD = 0.1`
  - `NEGOTIATION_WINDOW_MS = 86_400_000`
  - `ENDING_SOON_LEAD_MS = 600_000`
  - `NO_BID_ALERT_MS = 172_800_000`
  - `BELOW_RESERVE_LEAD_MS = 3_600_000`
  - `softCloseExtension(auction: Auction, bidAt: number): number`
  - `highestBid(bids: Bid[], excludeDealerIds?: string[]): Bid | null`
  - `type CloseOutcome = { kind: 'deal'; dealerId: string; amount: number } | { kind: 'negotiate'; dealerId: string; amount: number } | { kind: 'passed'; reason: CloseReason }`
  - `resolveClose(auction: Auction, bids: Bid[], excludeDealerIds?: string[]): CloseOutcome`

- [ ] **Step 1: 寫失敗測試**

`src/engine/rules.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { Auction, AuctionType, Bid } from '@/types'
import { highestBid, resolveClose, softCloseExtension } from '@/engine/rules'

const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 600_000,
    originalEndAt: T0 + 600_000,
    startPrice: 500_000,
    reservePrice: 1_000_000,
    stepMode: 'auto',
    extendedMs: 0,
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

function bid(dealerId: string, amount: number, at = T0): Bid {
  return { id: `b-${dealerId}-${amount}`, auctionId: 'a1', dealerId, amount, at, kind: 'manual' }
}

describe('softCloseExtension 定時開標', () => {
  it('結標前 3 分鐘內出價延長 3 分鐘', () => {
    const a = auction({ endAt: T0 + 120_000 })
    expect(softCloseExtension(a, T0)).toBe(180_000)
  })
  it('結標前 4 分鐘出價不延長', () => {
    const a = auction({ endAt: T0 + 240_000 })
    expect(softCloseExtension(a, T0)).toBe(0)
  })
  it('剛好等於窗口邊界不延長', () => {
    const a = auction({ endAt: T0 + 180_000 })
    expect(softCloseExtension(a, T0)).toBe(0)
  })
  it('累計延長達 60 分鐘上限後不再延長', () => {
    const a = auction({ endAt: T0 + 60_000, extendedMs: 3_600_000 })
    expect(softCloseExtension(a, T0)).toBe(0)
  })
  it('接近上限時只延長到上限為止', () => {
    const a = auction({ endAt: T0 + 60_000, extendedMs: 3_600_000 - 60_000 })
    expect(softCloseExtension(a, T0)).toBe(60_000)
  })
})

describe('softCloseExtension 其他拍賣方式', () => {
  it('即時同步拍用 15 秒窗口', () => {
    const a = auction({ type: 'LIVE', endAt: T0 + 10_000 })
    expect(softCloseExtension(a, T0)).toBe(15_000)
  })
  it('即時同步拍無延長上限', () => {
    const a = auction({ type: 'LIVE', endAt: T0 + 10_000, extendedMs: 10 * 3_600_000 })
    expect(softCloseExtension(a, T0)).toBe(15_000)
  })
  it('密封投標不延長', () => {
    const a = auction({ type: 'SEALED' as AuctionType, endAt: T0 + 1_000 })
    expect(softCloseExtension(a, T0)).toBe(0)
  })
})

describe('highestBid', () => {
  it('無出價回傳 null', () => {
    expect(highestBid([])).toBeNull()
  })
  it('回傳金額最高者', () => {
    expect(highestBid([bid('d1', 100), bid('d2', 300), bid('d3', 200)])!.dealerId).toBe('d2')
  })
  it('同額時較早出價者勝', () => {
    const early = bid('d1', 300, T0)
    const late = bid('d2', 300, T0 + 1_000)
    expect(highestBid([late, early])!.dealerId).toBe('d1')
  })
  it('排除指定車商', () => {
    const bids = [bid('d1', 300), bid('d2', 200)]
    expect(highestBid(bids, ['d1'])!.dealerId).toBe('d2')
  })
})

describe('resolveClose', () => {
  it('無出價為流標，原因為無人出價', () => {
    expect(resolveClose(auction(), [])).toEqual({ kind: 'passed', reason: '無人出價' })
  })
  it('最高價達到底價為成交', () => {
    expect(resolveClose(auction(), [bid('d1', 1_000_000)])).toEqual({
      kind: 'deal',
      dealerId: 'd1',
      amount: 1_000_000,
    })
  })
  it('最高價超過底價為成交', () => {
    expect(resolveClose(auction(), [bid('d1', 1_200_000)])).toEqual({
      kind: 'deal',
      dealerId: 'd1',
      amount: 1_200_000,
    })
  })
  it('差距 9% 進入議價，金額為底價', () => {
    expect(resolveClose(auction(), [bid('d1', 910_000)])).toEqual({
      kind: 'negotiate',
      dealerId: 'd1',
      amount: 1_000_000,
    })
  })
  it('差距剛好 10% 不進議價', () => {
    expect(resolveClose(auction(), [bid('d1', 900_000)])).toEqual({
      kind: 'passed',
      reason: '未達底價',
    })
  })
  it('差距 11% 為流標', () => {
    expect(resolveClose(auction(), [bid('d1', 890_000)])).toEqual({
      kind: 'passed',
      reason: '未達底價',
    })
  })
  it('排除已放棄議價者後改問次高', () => {
    const bids = [bid('d1', 950_000), bid('d2', 930_000)]
    expect(resolveClose(auction(), bids, ['d1'])).toEqual({
      kind: 'negotiate',
      dealerId: 'd2',
      amount: 1_000_000,
    })
  })
  it('全部放棄後為議價失敗', () => {
    const bids = [bid('d1', 950_000)]
    expect(resolveClose(auction(), bids, ['d1'])).toEqual({
      kind: 'passed',
      reason: '議價失敗',
    })
  })
})
```

注意兩個刻意的判定：`softCloseExtension` 用嚴格小於（`remaining < windowMs`），所以剛好等於窗口不延長；`resolveClose` 的議價門檻用嚴格小於 10%，所以剛好 10% 直接流標。測試把這兩個邊界都釘住了。

`resolveClose` 帶 `excludeDealerIds` 時若找不到任何可問的人，原因是 `'議價失敗'` 而非 `'無人出價'`——因為確實有人出過價。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/rules.test.ts`
Expected: FAIL，無法解析 `@/engine/rules`

- [ ] **Step 3: 實作 `src/engine/rules.ts`**

```ts
import { priceGapRatio } from '@/lib/money'
import type { Auction, AuctionType, Bid, CloseReason } from '@/types'

export const SOFT_CLOSE: Record<
  AuctionType,
  { windowMs: number; extendMs: number; capMs: number } | null
> = {
  SCHEDULED: { windowMs: 180_000, extendMs: 180_000, capMs: 3_600_000 },
  LIVE: { windowMs: 15_000, extendMs: 15_000, capMs: Number.POSITIVE_INFINITY },
  SEALED: null,
}

export const NEGOTIATION_THRESHOLD = 0.1
export const NEGOTIATION_WINDOW_MS = 86_400_000
export const ENDING_SOON_LEAD_MS = 600_000
export const NO_BID_ALERT_MS = 172_800_000
export const BELOW_RESERVE_LEAD_MS = 3_600_000

export function softCloseExtension(auction: Auction, bidAt: number): number {
  const cfg = SOFT_CLOSE[auction.type]
  if (!cfg) return 0
  const remaining = auction.endAt - bidAt
  if (remaining < 0 || remaining >= cfg.windowMs) return 0
  const room = cfg.capMs - auction.extendedMs
  if (room <= 0) return 0
  return Math.min(cfg.extendMs, room)
}

export function highestBid(bids: Bid[], excludeDealerIds: string[] = []): Bid | null {
  const pool = bids.filter((b) => !excludeDealerIds.includes(b.dealerId))
  if (pool.length === 0) return null
  return pool.reduce((best, b) => {
    if (b.amount > best.amount) return b
    if (b.amount === best.amount && b.at < best.at) return b
    return best
  })
}

export type CloseOutcome =
  | { kind: 'deal'; dealerId: string; amount: number }
  | { kind: 'negotiate'; dealerId: string; amount: number }
  | { kind: 'passed'; reason: CloseReason }

export function resolveClose(
  auction: Auction,
  bids: Bid[],
  excludeDealerIds: string[] = [],
): CloseOutcome {
  if (bids.length === 0) return { kind: 'passed', reason: '無人出價' }

  const top = highestBid(bids, excludeDealerIds)
  if (!top) return { kind: 'passed', reason: '議價失敗' }

  if (top.amount >= auction.reservePrice) {
    return { kind: 'deal', dealerId: top.dealerId, amount: top.amount }
  }
  if (priceGapRatio(auction.reservePrice, top.amount) < NEGOTIATION_THRESHOLD) {
    return { kind: 'negotiate', dealerId: top.dealerId, amount: auction.reservePrice }
  }
  return {
    kind: 'passed',
    reason: excludeDealerIds.length > 0 ? '議價失敗' : '未達底價',
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/rules.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/rules.ts src/engine/rules.test.ts
git commit -m "feat: 引擎規則層（軟結標延長與結標判定）"
```

---

## Task 5: 代理出價解析（TDD）

**Files:**
- Create: `src/engine/proxy.ts`
- Test: `src/engine/proxy.test.ts`

**Interfaces:**
- Consumes: `Auction`, `Bid`, `ProxyBid` from `@/types`；`bidStepFor` from `@/lib/money`；`highestBid` from `@/engine/rules`
- Produces:
  - `resolveProxyBids(args: { auction: Auction; bids: Bid[]; proxies: ProxyBid[]; now: number; nextId: () => string }): { newBids: Bid[]; exhaustedDealerIds: string[]; outbidDealerIds: string[] }`

`resolveProxyBids` **不修改**傳入的陣列，只回傳新增的出價與受影響的車商。呼叫方負責合併。

- [ ] **Step 1: 寫失敗測試**

`src/engine/proxy.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { Auction, Bid, ProxyBid } from '@/types'
import { resolveProxyBids } from '@/engine/proxy'

const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 86_400_000,
    originalEndAt: T0 + 86_400_000,
    startPrice: 500_000,
    reservePrice: 2_000_000,
    stepMode: 'auto',
    extendedMs: 0,
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

function bid(dealerId: string, amount: number, at = T0): Bid {
  return { id: `b-${dealerId}-${amount}`, auctionId: 'a1', dealerId, amount, at, kind: 'manual' }
}

function proxy(dealerId: string, maxAmount: number, createdAt = T0): ProxyBid {
  return { auctionId: 'a1', dealerId, maxAmount, active: true, createdAt }
}

let counter = 0
const nextId = () => `p${++counter}`
function fresh() {
  counter = 0
}

describe('resolveProxyBids', () => {
  it('沒有代理時不產生任何出價', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 600_000)],
      proxies: [],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('代理只出打敗目前最高價所需的最小金額', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toHaveLength(1)
    expect(r.newBids[0]).toMatchObject({ dealerId: 'd2', amount: 710_000, kind: 'proxy' })
    expect(r.outbidDealerIds).toEqual(['d1'])
  })

  it('目前領先者自己的代理不會自我加價', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d2', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('代理上限不足以加一級距時不出價，並標記為用盡', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 705_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
    expect(r.exhaustedDealerIds).toEqual(['d2'])
  })

  it('兩方代理互頂，價格停在較低上限加一級距，較高上限者領先', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_000_000), proxy('d3', 900_000)],
      now: T0,
      nextId,
    })
    const last = r.newBids[r.newBids.length - 1]
    expect(last.dealerId).toBe('d2')
    expect(last.amount).toBe(910_000)
    expect(r.exhaustedDealerIds).toContain('d3')
  })

  it('代理上限相同時較早設定者以該金額領先', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d3', 1_000_000, T0 + 5_000), proxy('d2', 1_000_000, T0)],
      now: T0,
      nextId,
    })
    const last = r.newBids[r.newBids.length - 1]
    expect(last.dealerId).toBe('d2')
    expect(r.exhaustedDealerIds).toContain('d3')
  })

  it('代理能一路加到自己的上限但不超過', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 995_000)],
      proxies: [proxy('d2', 1_000_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids[0].amount).toBe(1_000_000)
  })

  it('已停用的代理不參與', () => {
    fresh()
    const p = { ...proxy('d2', 1_500_000), active: false }
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [p],
      now: T0,
      nextId,
    })
    expect(r.newBids).toEqual([])
  })

  it('無人出價時代理以起標價進場', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [],
      proxies: [proxy('d2', 1_500_000)],
      now: T0,
      nextId,
    })
    expect(r.newBids[0].amount).toBe(500_000)
    expect(r.outbidDealerIds).toEqual([])
  })

  it('產生的出價 id 來自 nextId，且時間為 now', () => {
    fresh()
    const r = resolveProxyBids({
      auction: auction(),
      bids: [bid('d1', 700_000)],
      proxies: [proxy('d2', 1_500_000)],
      now: T0 + 999,
      nextId,
    })
    expect(r.newBids[0].id).toBe('p1')
    expect(r.newBids[0].at).toBe(T0 + 999)
  })
})
```

「兩方代理互頂」這題是最容易寫錯的一題。手動出價 700,000，d2 上限 100 萬、d3 上限 90 萬。正確結果是價格被推到 910,000 由 d2 領先（d3 頂到 90 萬後無力再加），而不是直接跳到 d2 的 100 萬——代理的定義就是「只出打敗對手所需的最小金額」。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/proxy.test.ts`
Expected: FAIL，無法解析 `@/engine/proxy`

- [ ] **Step 3: 實作 `src/engine/proxy.ts`**

```ts
import { bidStepFor } from '@/lib/money'
import { highestBid } from '@/engine/rules'
import type { Auction, Bid, ProxyBid } from '@/types'

const MAX_ITERATIONS = 50

export function resolveProxyBids(args: {
  auction: Auction
  bids: Bid[]
  proxies: ProxyBid[]
  now: number
  nextId: () => string
}): { newBids: Bid[]; exhaustedDealerIds: string[]; outbidDealerIds: string[] } {
  const { auction, now, nextId } = args
  const working = [...args.bids]
  const newBids: Bid[] = []
  const exhausted = new Set<string>()
  const outbid = new Set<string>()

  const candidates = args.proxies
    .filter((p) => p.auctionId === auction.id && p.active)
    .sort((a, b) => b.maxAmount - a.maxAmount || a.createdAt - b.createdAt)

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const top = highestBid(working)
    const currentPrice = top ? top.amount : null
    const required =
      currentPrice === null
        ? auction.startPrice
        : currentPrice + bidStepFor(currentPrice, auction.stepMode, auction.fixedStep)

    const next = candidates.find(
      (p) => p.dealerId !== top?.dealerId && !exhausted.has(p.dealerId) && p.maxAmount >= required,
    )

    if (!next) {
      for (const p of candidates) {
        if (p.dealerId !== top?.dealerId && p.maxAmount < required) exhausted.add(p.dealerId)
      }
      break
    }

    const amount = Math.min(next.maxAmount, required)
    const placed: Bid = {
      id: nextId(),
      auctionId: auction.id,
      dealerId: next.dealerId,
      amount,
      at: now,
      kind: 'proxy',
    }
    working.push(placed)
    newBids.push(placed)
    if (top) outbid.add(top.dealerId)
  }

  for (const id of outbid) {
    if (highestBid(working)?.dealerId === id) outbid.delete(id)
  }

  return {
    newBids,
    exhaustedDealerIds: [...exhausted],
    outbidDealerIds: [...outbid],
  }
}
```

最後那個清理迴圈很重要：互頂過程中 d2 可能先被 d3 超越、之後又反超回來。最終仍領先的人不該收到「您已被超越」通知。

> **⚠️ 執行時的修正**：上面這個逐級互頂的實作有公平性缺陷——**級距的奇偶會決定誰贏**。兩方上限相同時，較晚設定的一方可能只因為剛好踩在某一階而勝出，違反「上限相同時較早設定者勝」。
>
> 實際採用的是**先解析、再產生紀錄**：
> 1. 把所有 active 代理視為參賽者 `{ dealerId, ceiling, order }`；若目前領先者沒有代理，以他已出的金額為天花板並視為最早進場
> 2. 依 `(ceiling desc, order asc)` 排序 → 第一名是勝者，第二名決定價格
> 3. `settle = min(勝者上限, 次高上限 + 一級距)`；若 `settle < required` 則沒人能出價，所有代理標記為上限用盡
> 4. 勝者本來就領先時，只有在「次高上限 ≥ required」時才回應，否則不自我加價
> 5. 次高若也是代理，先產生一筆他推到自己上限的出價，再產生勝者的成交出價，讓紀錄看得出競價過程
>
> 另外 `代理能一路加到自己的上限但不超過` 原本的情境（目前價 995,000、上限 1,000,000）與「必須加滿一級距」互相矛盾，已改為目前價 990,000（剛好落在級距邊界），並補一條「湊不到一個完整級距時不出價」的對照測試。
>
> 最終實作見 `src/engine/proxy.ts`，共 13 條測試。

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/proxy.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/proxy.ts src/engine/proxy.test.ts
git commit -m "feat: 代理出價解析迴圈"
```

---

## Task 6: 出價落地 `placeBid`（TDD）

**Files:**
- Create: `src/engine/events.ts`, `src/engine/bid.ts`
- Test: `src/engine/bid.test.ts`

**Interfaces:**
- Consumes: `EngineData`, `Auction`, `Bid` from `@/types`；`softCloseExtension`, `highestBid` from `@/engine/rules`；`resolveProxyBids` from `@/engine/proxy`；`validateBidAmount`, `nextValidBid` from `@/lib/money`
- Produces:
  - `type EngineEvent`（見下，後續 Task 7、8 都用這個聯集）
  - `placeBid(data: EngineData, args: { auctionId: string; dealerId: string; amount: number; now: number; nextId: () => string }): { data: EngineData; events: EngineEvent[]; error?: string }`
  - `currentPriceOf(data: EngineData, auctionId: string): number | null`
  - `bidsOf(data: EngineData, auctionId: string): Bid[]`

- [ ] **Step 1: 定義事件聯集 `src/engine/events.ts`**

```ts
import type { CloseReason } from '@/types'

export type EngineEvent =
  | { type: 'STARTED'; auctionId: string }
  | { type: 'NEW_BID'; auctionId: string; dealerId: string; amount: number }
  | { type: 'OUTBID'; auctionId: string; dealerId: string; reason: 'outbid' | 'proxy_exhausted' }
  | { type: 'EXTENDED'; auctionId: string; extendedMs: number }
  | { type: 'ENDING_SOON'; auctionId: string }
  | { type: 'ENDING_BELOW_RESERVE'; auctionId: string }
  | { type: 'NO_BID_ALERT'; auctionId: string }
  | { type: 'CLOSED_DEAL'; auctionId: string; dealerId: string; amount: number }
  | { type: 'CLOSED_PASSED'; auctionId: string; reason: CloseReason }
  | { type: 'NEGOTIATION_INVITE'; auctionId: string; dealerId: string; amount: number }
  | { type: 'WITHDRAWN'; auctionId: string }
```

- [ ] **Step 2: 寫失敗測試**

`src/engine/bid.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import type { Auction, EngineData, Vehicle } from '@/types'
import { placeBid } from '@/engine/bid'

const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function vehicle(): Vehicle {
  return {
    id: 'v1',
    orderNo: 'ORD-2026-0001',
    brand: 'Toyota',
    model: 'Alphard',
    year: 2019,
    mileage: 62_000,
    plate: '品川 330 あ 12-34',
    vin: 'JT1234567890ABCDE',
    displacement: 2493,
    fuel: '汽油',
    transmission: 'CVT',
    drive: 'FF',
    color: '珍珠白',
    seats: 7,
    bodyType: '七人車',
    grade: '4.5',
    interiorGrade: 'B',
    photoSeeds: [1, 2, 3],
    remarks: '',
    loanBalance: 1_500_000,
    status: '拍賣中',
    createdAt: T0 - 172_800_000,
  }
}

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 86_400_000,
    originalEndAt: T0 + 86_400_000,
    startPrice: 500_000,
    reservePrice: 2_000_000,
    stepMode: 'auto',
    extendedMs: 0,
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

function data(over: Partial<EngineData> = {}): EngineData {
  return {
    vehicles: [vehicle()],
    auctions: [auction()],
    bids: [],
    proxies: [],
    watches: [],
    ...over,
  }
}

let counter = 0
const nextId = () => `n${++counter}`
beforeEach(() => {
  counter = 0
})

describe('placeBid 基本行為', () => {
  it('第一筆出價金額必須等於起標價', () => {
    const r = placeBid(data(), { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.error).toBeUndefined()
    expect(r.data.bids).toHaveLength(1)
    expect(r.data.bids[0]).toMatchObject({ dealerId: 'd1', amount: 500_000, kind: 'manual' })
  })

  it('產生 NEW_BID 事件', () => {
    const r = placeBid(data(), { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.events).toEqual([
      { type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 500_000 },
    ])
  })

  it('第二筆出價超越第一筆時對前者發 OUTBID', () => {
    const d = placeBid(data(), { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId }).data
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd2', amount: 510_000, now: T0 + 1_000, nextId })
    expect(r.events).toContainEqual({
      type: 'OUTBID',
      auctionId: 'a1',
      dealerId: 'd1',
      reason: 'outbid',
    })
  })
})

describe('placeBid 拒絕的情況', () => {
  it('拍賣不存在', () => {
    const r = placeBid(data(), { auctionId: 'nope', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.error).toBe('找不到這筆拍賣')
    expect(r.data.bids).toHaveLength(0)
  })

  it('拍賣未開始', () => {
    const d = data({ auctions: [auction({ status: '未開始', startAt: T0 + 3_600_000 })] })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.error).toBe('拍賣尚未開始')
  })

  it('拍賣已結束', () => {
    const d = data({ auctions: [auction({ status: '已成交' })] })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.error).toBe('拍賣已結束')
  })

  it('金額低於合法出價', () => {
    const r = placeBid(data(), { auctionId: 'a1', dealerId: 'd1', amount: 490_000, now: T0, nextId })
    expect(r.error).toBe('至少需出 ¥500,000')
  })

  it('密封投標同一家車商不得投第二次', () => {
    const d = data({ auctions: [auction({ type: 'SEALED' })] })
    const first = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 600_000, now: T0, nextId })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 700_000,
      now: T0 + 1_000,
      nextId,
    })
    expect(second.error).toBe('密封投標每家車商僅能投標一次')
    expect(second.data.bids).toHaveLength(1)
  })
})

describe('placeBid 密封投標的特殊規則', () => {
  it('密封投標不必高於他人出價，只需達到起標價', () => {
    const d = data({ auctions: [auction({ type: 'SEALED' })] })
    const first = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 900_000, now: T0, nextId })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 600_000,
      now: T0 + 1_000,
      nextId,
    })
    expect(second.error).toBeUndefined()
    expect(second.data.bids).toHaveLength(2)
  })

  it('密封投標不發 OUTBID', () => {
    const d = data({ auctions: [auction({ type: 'SEALED' })] })
    const first = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 600_000, now: T0, nextId })
    const second = placeBid(first.data, {
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 900_000,
      now: T0 + 1_000,
      nextId,
    })
    expect(second.events.some((e) => e.type === 'OUTBID')).toBe(false)
  })

  it('達到立即成交價立刻成交，不等結標時間', () => {
    const d = data({ auctions: [auction({ type: 'SEALED', buyNowPrice: 1_800_000 })] })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 1_800_000, now: T0, nextId })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_800_000, at: T0 })
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 1_800_000,
    })
  })
})

describe('placeBid 軟結標', () => {
  it('結標前 2 分鐘出價會延長 3 分鐘並發 EXTENDED', () => {
    const d = data({ auctions: [auction({ endAt: T0 + 120_000 })] })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.data.auctions[0].endAt).toBe(T0 + 120_000 + 180_000)
    expect(r.data.auctions[0].extendedMs).toBe(180_000)
    expect(r.data.auctions[0].originalEndAt).toBe(T0 + 120_000)
    expect(r.events).toContainEqual({ type: 'EXTENDED', auctionId: 'a1', extendedMs: 180_000 })
  })

  it('距結標還久不延長也不發 EXTENDED', () => {
    const r = placeBid(data(), { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(r.data.auctions[0].endAt).toBe(T0 + 86_400_000)
    expect(r.events.some((e) => e.type === 'EXTENDED')).toBe(false)
  })
})

describe('placeBid 觸發代理出價', () => {
  it('手動出價低於他人代理上限時代理自動反超', () => {
    const d = data({
      proxies: [{ auctionId: 'a1', dealerId: 'd2', maxAmount: 1_000_000, active: true, createdAt: T0 - 1_000 }],
    })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 700_000, now: T0, nextId })
    expect(r.data.bids).toHaveLength(2)
    expect(r.data.bids[1]).toMatchObject({ dealerId: 'd2', amount: 710_000, kind: 'proxy' })
    expect(r.events).toContainEqual({
      type: 'OUTBID',
      auctionId: 'a1',
      dealerId: 'd1',
      reason: 'outbid',
    })
  })

  it('代理上限用盡時停用該代理並發 proxy_exhausted', () => {
    const d = data({
      proxies: [{ auctionId: 'a1', dealerId: 'd2', maxAmount: 705_000, active: true, createdAt: T0 - 1_000 }],
    })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 700_000, now: T0, nextId })
    expect(r.data.proxies[0].active).toBe(false)
    expect(r.events).toContainEqual({
      type: 'OUTBID',
      auctionId: 'a1',
      dealerId: 'd2',
      reason: 'proxy_exhausted',
    })
  })

  it('代理反超後也會觸發軟結標延長', () => {
    const d = data({
      auctions: [auction({ endAt: T0 + 60_000 })],
      proxies: [{ auctionId: 'a1', dealerId: 'd2', maxAmount: 1_000_000, active: true, createdAt: T0 - 1_000 }],
    })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 700_000, now: T0, nextId })
    expect(r.data.auctions[0].extendedMs).toBe(180_000)
  })

  it('密封投標不觸發代理', () => {
    const d = data({
      auctions: [auction({ type: 'SEALED' })],
      proxies: [{ auctionId: 'a1', dealerId: 'd2', maxAmount: 1_000_000, active: true, createdAt: T0 - 1_000 }],
    })
    const r = placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 700_000, now: T0, nextId })
    expect(r.data.bids).toHaveLength(1)
  })
})

describe('placeBid 不變性', () => {
  it('不修改傳入的 data', () => {
    const d = data()
    placeBid(d, { auctionId: 'a1', dealerId: 'd1', amount: 500_000, now: T0, nextId })
    expect(d.bids).toHaveLength(0)
    expect(d.auctions[0].endAt).toBe(T0 + 86_400_000)
  })
})
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/engine/bid.test.ts`
Expected: FAIL，無法解析 `@/engine/bid`

- [ ] **Step 4: 實作 `src/engine/bid.ts`**

```ts
import { nextValidBid, validateBidAmount } from '@/lib/money'
import type { EngineEvent } from '@/engine/events'
import { resolveProxyBids } from '@/engine/proxy'
import { highestBid, softCloseExtension } from '@/engine/rules'
import type { Auction, Bid, EngineData } from '@/types'

export function bidsOf(data: EngineData, auctionId: string): Bid[] {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function currentPriceOf(data: EngineData, auctionId: string): number | null {
  return highestBid(bidsOf(data, auctionId))?.amount ?? null
}

const OPEN_STATUSES = new Set(['進行中'])

export function placeBid(
  data: EngineData,
  args: { auctionId: string; dealerId: string; amount: number; now: number; nextId: () => string },
): { data: EngineData; events: EngineEvent[]; error?: string } {
  const { auctionId, dealerId, amount, now, nextId } = args
  const auction = data.auctions.find((a) => a.id === auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status === '未開始') return { data, events: [], error: '拍賣尚未開始' }
  if (!OPEN_STATUSES.has(auction.status)) return { data, events: [], error: '拍賣已結束' }

  const existing = bidsOf(data, auctionId)
  const isSealed = auction.type === 'SEALED'

  if (isSealed && existing.some((b) => b.dealerId === dealerId)) {
    return { data, events: [], error: '密封投標每家車商僅能投標一次' }
  }

  // 密封投標看不到他人出價，因此門檻是起標價而非目前最高價
  const basePrice = isSealed ? null : (highestBid(existing)?.amount ?? null)
  const check = validateBidAmount(auction, basePrice, amount)
  if (!check.ok) return { data, events: [], error: check.reason }

  const events: EngineEvent[] = []
  const previousLeader = isSealed ? null : highestBid(existing)?.dealerId ?? null

  const placed: Bid = {
    id: nextId(),
    auctionId,
    dealerId,
    amount,
    at: now,
    kind: 'manual',
  }

  let bids = [...data.bids, placed]
  let nextAuction: Auction = { ...auction }
  let proxies = data.proxies
  let vehicles = data.vehicles

  events.push({ type: 'NEW_BID', auctionId, dealerId, amount })
  if (previousLeader && previousLeader !== dealerId) {
    events.push({ type: 'OUTBID', auctionId, dealerId: previousLeader, reason: 'outbid' })
  }

  // 立即成交價：僅密封投標可設
  if (isSealed && nextAuction.buyNowPrice && amount >= nextAuction.buyNowPrice) {
    nextAuction = {
      ...nextAuction,
      status: '已成交',
      deal: { dealerId, amount, at: now },
    }
    vehicles = vehicles.map((v) => (v.id === nextAuction.vehicleId ? { ...v, status: '已售出' } : v))
    events.push({ type: 'CLOSED_DEAL', auctionId, dealerId, amount })
    return {
      data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids, proxies },
      events,
    }
  }

  if (!isSealed) {
    const proxyResult = resolveProxyBids({
      auction: nextAuction,
      bids: bidsOf({ ...data, bids }, auctionId),
      proxies,
      now,
      nextId,
    })

    bids = [...bids, ...proxyResult.newBids]

    for (const id of proxyResult.outbidDealerIds) {
      events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'outbid' })
    }
    for (const id of proxyResult.exhaustedDealerIds) {
      events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'proxy_exhausted' })
      proxies = proxies.map((p) =>
        p.auctionId === auctionId && p.dealerId === id ? { ...p, active: false } : p,
      )
    }
    for (const b of proxyResult.newBids) {
      events.push({ type: 'NEW_BID', auctionId, dealerId: b.dealerId, amount: b.amount })
    }
  }

  const extension = softCloseExtension(nextAuction, now)
  if (extension > 0) {
    nextAuction = {
      ...nextAuction,
      endAt: nextAuction.endAt + extension,
      extendedMs: nextAuction.extendedMs + extension,
    }
    events.push({ type: 'EXTENDED', auctionId, extendedMs: extension })
  }

  return {
    data: { ...data, vehicles, auctions: replace(data.auctions, nextAuction), bids, proxies },
    events,
  }
}

function replace(auctions: Auction[], next: Auction): Auction[] {
  return auctions.map((a) => (a.id === next.id ? next : a))
}
```

三個容易寫錯的點：

1. **`originalEndAt` 不隨延長改變**——它是「原定結標時間」，UI 靠它顯示「已延長」。延長只動 `endAt` 與 `extendedMs`。
2. **軟結標的判定用延長前的 `endAt`**，且在代理解析之後才做一次，不是每筆代理出價各延一次。
3. **密封投標的 `basePrice` 傳 `null`**，讓門檻退回起標價；車商看不到他人金額，不能要求他必須高於別人。

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/engine/bid.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/events.ts src/engine/bid.ts src/engine/bid.test.ts
git commit -m "feat: placeBid（驗證、軟結標、代理解析、立即成交）"
```

---

## Task 7: 時間驅動的 `advanceAuctions`（TDD）

**Files:**
- Create: `src/engine/advance.ts`
- Test: `src/engine/advance.test.ts`, `src/engine/testFixtures.ts`

**Interfaces:**
- Consumes: 全部前述引擎模組
- Produces:
  - `advanceAuctions(data: EngineData, now: number, nextId: () => string): { data: EngineData; events: EngineEvent[]; changed: boolean }`
  - `src/engine/testFixtures.ts` 匯出 `T0`, `makeVehicle`, `makeAuction`, `makeBid`, `makeData`，供本 Task 與 Task 8 的測試共用

- [ ] **Step 1: 把測試 fixture 抽成共用模組**

`src/engine/testFixtures.ts`（把 Task 6 測試裡的工廠函式搬過來並匯出）：

```ts
import type { Auction, Bid, EngineData, ProxyBid, Vehicle } from '@/types'

export const T0 = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

export function makeVehicle(over: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    orderNo: 'ORD-2026-0001',
    brand: 'Toyota',
    model: 'Alphard',
    year: 2019,
    mileage: 62_000,
    plate: '品川 330 あ 12-34',
    vin: 'JT1234567890ABCDE',
    displacement: 2493,
    fuel: '汽油',
    transmission: 'CVT',
    drive: 'FF',
    color: '珍珠白',
    seats: 7,
    bodyType: '七人車',
    grade: '4.5',
    interiorGrade: 'B',
    photoSeeds: [1, 2, 3],
    remarks: '',
    loanBalance: 1_500_000,
    status: '拍賣中',
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

export function makeAuction(over: Partial<Auction> = {}): Auction {
  return {
    id: 'a1',
    vehicleId: 'v1',
    type: 'SCHEDULED',
    status: '進行中',
    startAt: T0 - 86_400_000,
    endAt: T0 + 86_400_000,
    originalEndAt: T0 + 86_400_000,
    startPrice: 500_000,
    reservePrice: 2_000_000,
    stepMode: 'auto',
    extendedMs: 0,
    emittedKeys: [],
    createdAt: T0 - 172_800_000,
    ...over,
  }
}

export function makeBid(over: Partial<Bid> & { dealerId: string; amount: number }): Bid {
  return {
    id: `b-${over.dealerId}-${over.amount}`,
    auctionId: 'a1',
    at: T0,
    kind: 'manual',
    ...over,
  }
}

export function makeProxy(over: Partial<ProxyBid> & { dealerId: string; maxAmount: number }): ProxyBid {
  return { auctionId: 'a1', active: true, createdAt: T0, ...over }
}

export function makeData(over: Partial<EngineData> = {}): EngineData {
  return {
    vehicles: [makeVehicle()],
    auctions: [makeAuction()],
    bids: [],
    proxies: [],
    watches: [],
    ...over,
  }
}

export function makeIdGen(): () => string {
  let n = 0
  return () => `n${++n}`
}
```

- [ ] **Step 2: 寫失敗測試**

`src/engine/advance.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { advanceAuctions } from '@/engine/advance'
import { T0, makeAuction, makeBid, makeData, makeIdGen, makeProxy, makeVehicle } from '@/engine/testFixtures'

describe('開標', () => {
  it('時間到把未開始轉為進行中並發 STARTED', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0, endAt: T0 + 86_400_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('進行中')
    expect(r.data.vehicles[0].status).toBe('拍賣中')
    expect(r.events).toContainEqual({ type: 'STARTED', auctionId: 'a1' })
    expect(r.changed).toBe(true)
  })

  it('時間未到不動作，changed 為 false', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 + 1_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('未開始')
    expect(r.changed).toBe(false)
  })

  it('開標時已有代理出價則立即以起標價進場', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
      proxies: [makeProxy({ dealerId: 'd2', maxAmount: 1_500_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.bids).toHaveLength(1)
    expect(r.data.bids[0]).toMatchObject({ dealerId: 'd2', amount: 500_000, kind: 'proxy' })
  })
})

describe('結標判定', () => {
  it('無出價 → 已流標（無人出價），車輛回到在庫', () => {
    const d = makeData({ auctions: [makeAuction({ endAt: T0 })] })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('無人出價')
    expect(r.data.vehicles[0].status).toBe('在庫')
    expect(r.events).toContainEqual({ type: 'CLOSED_PASSED', auctionId: 'a1', reason: '無人出價' })
  })

  it('達到底價 → 已成交，車輛已售出', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_000_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 2_000_000, at: T0 })
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('差距 9% → 議價中，24 小時期限', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_820_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd1',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: [],
    })
    expect(r.data.vehicles[0].status).toBe('拍賣中')
    expect(r.events).toContainEqual({
      type: 'NEGOTIATION_INVITE',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('差距 11% → 已流標（未達底價）', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_780_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('未達底價')
  })
})

describe('議價期限', () => {
  it('期限到且有次高出價者 → 換人詢問並累加 declinedDealerIds', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          endAt: T0 - 86_400_000,
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [
        makeBid({ dealerId: 'd1', amount: 1_850_000 }),
        makeBid({ dealerId: 'd2', amount: 1_830_000 }),
      ],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd2',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: ['d1'],
    })
  })

  it('期限到且無次高者 → 已流標（議價失敗）', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          endAt: T0 - 86_400_000,
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [makeBid({ dealerId: 'd1', amount: 1_850_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('議價失敗')
    expect(r.data.vehicles[0].status).toBe('在庫')
  })
})

describe('提醒類事件', () => {
  it('結標前 10 分鐘內發一次 ENDING_SOON', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'ENDING_SOON', auctionId: 'a1' })
  })

  it('ENDING_SOON 只發一次', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const second = advanceAuctions(first.data, T0 + 1_000, makeIdGen())
    expect(second.events.some((e) => e.type === 'ENDING_SOON')).toBe(false)
  })

  it('延長後重新進入 10 分鐘窗口會再發一次 ENDING_SOON', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 300_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const extended = {
      ...first.data,
      auctions: [{ ...first.data.auctions[0], endAt: T0 + 300_000 + 180_000, extendedMs: 180_000 }],
    }
    const second = advanceAuctions(extended, T0 + 1_000, makeIdGen())
    expect(second.events).toContainEqual({ type: 'ENDING_SOON', auctionId: 'a1' })
  })

  it('開標滿 2 天無人出價發一次 NO_BID_ALERT', () => {
    const d = makeData({
      auctions: [makeAuction({ startAt: T0 - 172_800_000, endAt: T0 + 86_400_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'NO_BID_ALERT', auctionId: 'a1' })
    const again = advanceAuctions(r.data, T0 + 1_000, makeIdGen())
    expect(again.events.some((e) => e.type === 'NO_BID_ALERT')).toBe(false)
  })

  it('結標前 1 小時未達底價發一次 ENDING_BELOW_RESERVE', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 1_800_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 1_000_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toContainEqual({ type: 'ENDING_BELOW_RESERVE', auctionId: 'a1' })
  })

  it('已達底價不發 ENDING_BELOW_RESERVE', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 + 1_800_000 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_100_000 })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events.some((e) => e.type === 'ENDING_BELOW_RESERVE')).toBe(false)
  })
})

describe('冪等性與快轉', () => {
  it('同一個 now 重複呼叫，狀態與事件皆相同', () => {
    const d = makeData({
      auctions: [makeAuction({ endAt: T0 })],
      bids: [makeBid({ dealerId: 'd1', amount: 2_000_000 })],
    })
    const first = advanceAuctions(d, T0, makeIdGen())
    const second = advanceAuctions(first.data, T0, makeIdGen())
    expect(second.events).toEqual([])
    expect(second.changed).toBe(false)
    expect(second.data.auctions[0]).toEqual(first.data.auctions[0])
  })

  it('從開標前一次快轉到結標後，狀態正確且 ENDING_SOON 只出現一次', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0, endAt: T0 + 3_600_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = advanceAuctions(d, T0 + 7_200_000, makeIdGen())
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('無人出價')
    expect(r.events.filter((e) => e.type === 'ENDING_SOON')).toHaveLength(1)
    expect(r.events.filter((e) => e.type === 'STARTED')).toHaveLength(1)
  })

  it('已成交或已流標的拍賣不再產生任何事件', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '已流標', endAt: T0 - 86_400_000, closeReason: '無人出價' })],
    })
    const r = advanceAuctions(d, T0, makeIdGen())
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })

  it('已撤標的拍賣不再產生任何事件', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '已撤標', withdrawReason: '借款人清償' })],
    })
    const r = advanceAuctions(d, T0 + 86_400_000 * 10, makeIdGen())
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })
})

describe('不變性', () => {
  it('不修改傳入的 data', () => {
    const d = makeData({ auctions: [makeAuction({ endAt: T0 })] })
    advanceAuctions(d, T0, makeIdGen())
    expect(d.auctions[0].status).toBe('進行中')
  })
})
```

「延長後重新進入 10 分鐘窗口會再發一次 ENDING_SOON」這題定義了去重鍵必須含 `endAt`，否則延長後車商不會再收到即將結標提醒。

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/engine/advance.test.ts`
Expected: FAIL，無法解析 `@/engine/advance`

- [ ] **Step 4: 實作 `src/engine/advance.ts`**

```ts
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
import type { Auction, Bid, EngineData, Vehicle } from '@/types'

const TERMINAL = new Set<Auction['status']>(['已流標', '已成交', '已撤標'])

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
      changed = true
    }

    const setVehicle = (status: Vehicle['status']) => {
      vehicles = vehicles.map((v) => (v.id === a.vehicleId ? { ...v, status } : v))
      changed = true
    }

    // 1. 開標
    if (a.status === '未開始' && now >= a.startAt) {
      a = { ...a, status: '進行中' }
      setVehicle('拍賣中')
      emit('STARTED', { type: 'STARTED', auctionId: a.id })

      if (a.type !== 'SEALED') {
        const r = resolveProxyBids({
          auction: a,
          bids: bids.filter((b) => b.auctionId === a.id),
          proxies: data.proxies,
          now,
          nextId,
        })
        if (r.newBids.length > 0) {
          bids = [...bids, ...r.newBids]
          for (const b of r.newBids) {
            events.push({ type: 'NEW_BID', auctionId: a.id, dealerId: b.dealerId, amount: b.amount })
          }
          changed = true
        }
      }
    }

    const mine = () => bids.filter((b: Bid) => b.auctionId === a.id)

    // 2. 進行中的提醒
    if (a.status === '進行中') {
      const remaining = a.endAt - now
      const top = highestBid(mine())

      if (remaining > 0 && remaining <= ENDING_SOON_LEAD_MS) {
        emit(`ENDING_SOON:${a.endAt}`, { type: 'ENDING_SOON', auctionId: a.id })
      }
      if (
        remaining > 0 &&
        remaining <= BELOW_RESERVE_LEAD_MS &&
        (top?.amount ?? 0) < a.reservePrice
      ) {
        emit(`BELOW_RESERVE:${a.endAt}`, { type: 'ENDING_BELOW_RESERVE', auctionId: a.id })
      }
      if (!top && now - a.startAt >= NO_BID_ALERT_MS) {
        emit('NO_BID', { type: 'NO_BID_ALERT', auctionId: a.id })
      }
    }

    // 3. 結標
    if (a.status === '進行中' && now >= a.endAt) {
      const outcome = resolveClose(a, mine())
      if (outcome.kind === 'deal') {
        a = { ...a, status: '已成交', deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: now } }
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
      changed = true
    }

    // 4. 議價期限到，換問下一位
    while (a.status === '議價中' && a.negotiation && now >= a.negotiation.deadline) {
      const declined = [...a.negotiation.declinedDealerIds, a.negotiation.dealerId]
      const outcome = resolveClose(a, mine(), declined)
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
        a = { ...a, status: '已成交', deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: now }, negotiation: undefined }
        setVehicle('已售出')
        events.push({
          type: 'CLOSED_DEAL',
          auctionId: a.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        })
      }
      changed = true
    }

    if (a !== original) changed = true
    auctions.push(a)
  }

  if (!changed) return { data, events: [], changed: false }
  return { data: { ...data, vehicles, auctions, bids }, events, changed: true }
}
```

四個實作要點：

1. **`emittedKeys` 的鍵含 `endAt`**（`ENDING_SOON:${a.endAt}`），所以延長後會重新提醒一次。`NO_BID` 與 `STARTED` 不需要時間，用固定鍵。
2. **議價換人用 `while` 而非 `if`**：快轉三天時可能連續跳過多位車商的 24 小時期限，一次 tick 必須全部處理完。
3. **結標前的提醒判定放在結標之前**，所以「一次快轉跨過整個拍賣」時，`ENDING_SOON` 仍會發出（測試明確要求）。
4. **`changed` 為 false 時回傳原本的 `data` 物件參照**，讓 store 可以用 `===` 判斷要不要寫入，避免每 250ms 觸發一次 localStorage 寫入。

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/engine/advance.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: 把 Task 6 的測試改用共用 fixture**

編輯 `src/engine/bid.test.ts`，刪掉檔案內的 `vehicle()` / `auction()` / `bid()` / `data()` 區域定義，改為：

```ts
import { T0, makeAuction, makeBid, makeData, makeIdGen, makeProxy } from '@/engine/testFixtures'
```

並把呼叫改成 `makeAuction(...)` / `makeData(...)` / `makeBid({ dealerId: 'd1', amount: 500_000 })`。`nextId` 改用 `makeIdGen()`，`beforeEach` 的 counter 重設可以刪除。

- [ ] **Step 7: 執行全部測試確認沒有回歸**

Run: `npm test && npm run typecheck`
Expected: 全部 PASS，無型別錯誤

- [ ] **Step 8: Commit**

```bash
git add src/engine
git commit -m "feat: advanceAuctions（時間驅動狀態機、事件去重、議價輪替）"
```

---

## Task 8: 人為操作 —— 撤標與議價決議（TDD）

**Files:**
- Create: `src/engine/actions.ts`
- Test: `src/engine/actions.test.ts`

**Interfaces:**
- Consumes: `EngineData`, `Auction` from `@/types`；`EngineEvent` from `@/engine/events`；`highestBid`, `resolveClose`, `NEGOTIATION_WINDOW_MS` from `@/engine/rules`
- Produces（全部同一個回傳形狀 `ActionResult = { data: EngineData; events: EngineEvent[]; error?: string }`）：
  - `withdrawAuction(data, args: { auctionId: string; reason: string; byUserId: string }): ActionResult`
  - `acceptNegotiation(data, args: { auctionId: string; dealerId: string; now: number }): ActionResult`
  - `declineNegotiation(data, args: { auctionId: string; dealerId: string; now: number }): ActionResult`
  - `acceptHighestBid(data, args: { auctionId: string; now: number }): ActionResult`
  - `adjustReserve(data, args: { auctionId: string; reservePrice: number; now: number }): ActionResult`

- [ ] **Step 1: 寫失敗測試**

`src/engine/actions.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  acceptHighestBid,
  acceptNegotiation,
  adjustReserve,
  declineNegotiation,
  withdrawAuction,
} from '@/engine/actions'
import { T0, makeAuction, makeBid, makeData, makeVehicle } from '@/engine/testFixtures'

function negotiating() {
  return makeData({
    auctions: [
      makeAuction({
        status: '議價中',
        endAt: T0 - 3_600_000,
        negotiation: {
          dealerId: 'd1',
          amount: 2_000_000,
          deadline: T0 + 86_400_000,
          declinedDealerIds: [],
        },
      }),
    ],
    bids: [
      makeBid({ dealerId: 'd1', amount: 1_850_000 }),
      makeBid({ dealerId: 'd2', amount: 1_830_000 }),
    ],
  })
}

describe('withdrawAuction', () => {
  it('未開始的拍賣可撤標，車輛轉為已下架', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '未開始', startAt: T0 + 3_600_000 })],
      vehicles: [makeVehicle({ status: '已排拍' })],
    })
    const r = withdrawAuction(d, { auctionId: 'a1', reason: '借款人已清償欠款', byUserId: 'u-staff' })
    expect(r.error).toBeUndefined()
    expect(r.data.auctions[0].status).toBe('已撤標')
    expect(r.data.auctions[0].withdrawReason).toBe('借款人已清償欠款')
    expect(r.data.auctions[0].withdrawnBy).toBe('u-staff')
    expect(r.data.vehicles[0].status).toBe('已下架')
    expect(r.events).toEqual([{ type: 'WITHDRAWN', auctionId: 'a1' }])
  })

  it('進行中的拍賣可撤標', () => {
    const r = withdrawAuction(makeData(), {
      auctionId: 'a1',
      reason: '車輛有查扣爭議',
      byUserId: 'u-staff',
    })
    expect(r.data.auctions[0].status).toBe('已撤標')
  })

  it('理由少於 5 字被拒', () => {
    const r = withdrawAuction(makeData(), { auctionId: 'a1', reason: '不賣', byUserId: 'u-staff' })
    expect(r.error).toBe('撤標理由至少需 5 個字')
    expect(r.data.auctions[0].status).toBe('進行中')
  })

  it('已成交的拍賣不可撤標', () => {
    const d = makeData({ auctions: [makeAuction({ status: '已成交' })] })
    const r = withdrawAuction(d, { auctionId: 'a1', reason: '想要下架這台車', byUserId: 'u-staff' })
    expect(r.error).toBe('只有未開始或進行中的拍賣可以撤標')
  })

  it('停用該拍賣所有代理出價', () => {
    const d = makeData({
      proxies: [{ auctionId: 'a1', dealerId: 'd2', maxAmount: 1_000_000, active: true, createdAt: T0 }],
    })
    const r = withdrawAuction(d, { auctionId: 'a1', reason: '借款人已清償欠款', byUserId: 'u-staff' })
    expect(r.data.proxies[0].active).toBe(false)
  })
})

describe('acceptNegotiation', () => {
  it('被邀請的車商接受，以底價成交', () => {
    const r = acceptNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 2_000_000, at: T0 })
    expect(r.data.auctions[0].negotiation).toBeUndefined()
    expect(r.data.vehicles[0].status).toBe('已售出')
    expect(r.events).toContainEqual({
      type: 'CLOSED_DEAL',
      auctionId: 'a1',
      dealerId: 'd1',
      amount: 2_000_000,
    })
  })

  it('非被邀請的車商不能接受', () => {
    const r = acceptNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd2', now: T0 })
    expect(r.error).toBe('您不是這筆議價的邀請對象')
    expect(r.data.auctions[0].status).toBe('議價中')
  })

  it('不在議價中的拍賣不能接受', () => {
    const r = acceptNegotiation(makeData(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.error).toBe('這筆拍賣目前不在議價中')
  })
})

describe('declineNegotiation', () => {
  it('放棄後改邀次高出價者，期限重設', () => {
    const r = declineNegotiation(negotiating(), { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation).toEqual({
      dealerId: 'd2',
      amount: 2_000_000,
      deadline: T0 + 86_400_000,
      declinedDealerIds: ['d1'],
    })
    expect(r.events).toContainEqual({
      type: 'NEGOTIATION_INVITE',
      auctionId: 'a1',
      dealerId: 'd2',
      amount: 2_000_000,
    })
  })

  it('無次高者時轉為議價失敗', () => {
    const d = makeData({
      auctions: [
        makeAuction({
          status: '議價中',
          negotiation: {
            dealerId: 'd1',
            amount: 2_000_000,
            deadline: T0 + 86_400_000,
            declinedDealerIds: [],
          },
        }),
      ],
      bids: [makeBid({ dealerId: 'd1', amount: 1_850_000 })],
    })
    const r = declineNegotiation(d, { auctionId: 'a1', dealerId: 'd1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已流標')
    expect(r.data.auctions[0].closeReason).toBe('議價失敗')
    expect(r.data.vehicles[0].status).toBe('在庫')
  })
})

describe('acceptHighestBid（公司人員直接接受未達底價的最高價）', () => {
  it('以最高出價成交，而非底價', () => {
    const r = acceptHighestBid(negotiating(), { auctionId: 'a1', now: T0 })
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_850_000, at: T0 })
  })

  it('不在議價中的拍賣不可用', () => {
    const r = acceptHighestBid(makeData(), { auctionId: 'a1', now: T0 })
    expect(r.error).toBe('這筆拍賣目前不在議價中')
  })
})

describe('adjustReserve（公司人員調降底價）', () => {
  it('調降到最高價之下即立即成交', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 1_800_000, now: T0 })
    expect(r.data.auctions[0].reservePrice).toBe(1_800_000)
    expect(r.data.auctions[0].status).toBe('已成交')
    expect(r.data.auctions[0].deal).toEqual({ dealerId: 'd1', amount: 1_850_000, at: T0 })
  })

  it('調降後仍高於最高價則維持議價，並更新議價金額', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 1_900_000, now: T0 })
    expect(r.data.auctions[0].status).toBe('議價中')
    expect(r.data.auctions[0].negotiation!.amount).toBe(1_900_000)
    expect(r.data.auctions[0].negotiation!.dealerId).toBe('d1')
  })

  it('調高底價被拒', () => {
    const r = adjustReserve(negotiating(), { auctionId: 'a1', reservePrice: 2_100_000, now: T0 })
    expect(r.error).toBe('底價只能調降')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/actions.test.ts`
Expected: FAIL，無法解析 `@/engine/actions`

- [ ] **Step 3: 實作 `src/engine/actions.ts`**

```ts
import type { EngineEvent } from '@/engine/events'
import { NEGOTIATION_WINDOW_MS, highestBid, resolveClose } from '@/engine/rules'
import type { Auction, EngineData, Vehicle } from '@/types'

export type ActionResult = { data: EngineData; events: EngineEvent[]; error?: string }

const WITHDRAWABLE = new Set<Auction['status']>(['未開始', '進行中'])

function patch(
  data: EngineData,
  auction: Auction,
  vehicleStatus?: Vehicle['status'],
): EngineData {
  return {
    ...data,
    auctions: data.auctions.map((a) => (a.id === auction.id ? auction : a)),
    vehicles: vehicleStatus
      ? data.vehicles.map((v) => (v.id === auction.vehicleId ? { ...v, status: vehicleStatus } : v))
      : data.vehicles,
  }
}

function find(data: EngineData, auctionId: string): Auction | undefined {
  return data.auctions.find((a) => a.id === auctionId)
}

function bidsOf(data: EngineData, auctionId: string) {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function withdrawAuction(
  data: EngineData,
  args: { auctionId: string; reason: string; byUserId: string },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (!WITHDRAWABLE.has(auction.status)) {
    return { data, events: [], error: '只有未開始或進行中的拍賣可以撤標' }
  }
  if (args.reason.trim().length < 5) {
    return { data, events: [], error: '撤標理由至少需 5 個字' }
  }

  const next: Auction = {
    ...auction,
    status: '已撤標',
    withdrawReason: args.reason.trim(),
    withdrawnBy: args.byUserId,
    negotiation: undefined,
  }
  const withVehicle = patch(data, next, '已下架')

  return {
    data: {
      ...withVehicle,
      proxies: withVehicle.proxies.map((p) =>
        p.auctionId === auction.id ? { ...p, active: false } : p,
      ),
    },
    events: [{ type: 'WITHDRAWN', auctionId: auction.id }],
  }
}

export function acceptNegotiation(
  data: EngineData,
  args: { auctionId: string; dealerId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (auction.negotiation.dealerId !== args.dealerId) {
    return { data, events: [], error: '您不是這筆議價的邀請對象' }
  }

  const amount = auction.negotiation.amount
  const next: Auction = {
    ...auction,
    status: '已成交',
    deal: { dealerId: args.dealerId, amount, at: args.now },
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '已售出'),
    events: [{ type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: args.dealerId, amount }],
  }
}

export function declineNegotiation(
  data: EngineData,
  args: { auctionId: string; dealerId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (auction.negotiation.dealerId !== args.dealerId) {
    return { data, events: [], error: '您不是這筆議價的邀請對象' }
  }

  const declined = [...auction.negotiation.declinedDealerIds, args.dealerId]
  const outcome = resolveClose(auction, bidsOf(data, auction.id), declined)

  if (outcome.kind === 'negotiate') {
    const next: Auction = {
      ...auction,
      negotiation: {
        dealerId: outcome.dealerId,
        amount: outcome.amount,
        deadline: args.now + NEGOTIATION_WINDOW_MS,
        declinedDealerIds: declined,
      },
    }
    return {
      data: patch(data, next),
      events: [
        {
          type: 'NEGOTIATION_INVITE',
          auctionId: auction.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        },
      ],
    }
  }

  if (outcome.kind === 'deal') {
    const next: Auction = {
      ...auction,
      status: '已成交',
      deal: { dealerId: outcome.dealerId, amount: outcome.amount, at: args.now },
      negotiation: undefined,
    }
    return {
      data: patch(data, next, '已售出'),
      events: [
        {
          type: 'CLOSED_DEAL',
          auctionId: auction.id,
          dealerId: outcome.dealerId,
          amount: outcome.amount,
        },
      ],
    }
  }

  const next: Auction = {
    ...auction,
    status: '已流標',
    closeReason: outcome.reason,
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '在庫'),
    events: [{ type: 'CLOSED_PASSED', auctionId: auction.id, reason: outcome.reason }],
  }
}

export function acceptHighestBid(
  data: EngineData,
  args: { auctionId: string; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中') {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  const top = highestBid(bidsOf(data, auction.id))
  if (!top) return { data, events: [], error: '這筆拍賣沒有任何出價' }

  const next: Auction = {
    ...auction,
    status: '已成交',
    deal: { dealerId: top.dealerId, amount: top.amount, at: args.now },
    negotiation: undefined,
  }
  return {
    data: patch(data, next, '已售出'),
    events: [
      { type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: top.dealerId, amount: top.amount },
    ],
  }
}

export function adjustReserve(
  data: EngineData,
  args: { auctionId: string; reservePrice: number; now: number },
): ActionResult {
  const auction = find(data, args.auctionId)
  if (!auction) return { data, events: [], error: '找不到這筆拍賣' }
  if (auction.status !== '議價中' || !auction.negotiation) {
    return { data, events: [], error: '這筆拍賣目前不在議價中' }
  }
  if (args.reservePrice > auction.reservePrice) {
    return { data, events: [], error: '底價只能調降' }
  }

  const lowered: Auction = { ...auction, reservePrice: args.reservePrice }
  const top = highestBid(bidsOf(data, auction.id))

  if (top && top.amount >= args.reservePrice) {
    const next: Auction = {
      ...lowered,
      status: '已成交',
      deal: { dealerId: top.dealerId, amount: top.amount, at: args.now },
      negotiation: undefined,
    }
    return {
      data: patch(data, next, '已售出'),
      events: [
        { type: 'CLOSED_DEAL', auctionId: auction.id, dealerId: top.dealerId, amount: top.amount },
      ],
    }
  }

  const next: Auction = {
    ...lowered,
    negotiation: { ...auction.negotiation, amount: args.reservePrice },
  }
  return {
    data: patch(data, next),
    events: [
      {
        type: 'NEGOTIATION_INVITE',
        auctionId: auction.id,
        dealerId: auction.negotiation.dealerId,
        amount: args.reservePrice,
      },
    ],
  }
}
```

`adjustReserve` 調降後若最高價已達新底價，**成交金額是最高出價而非新底價**——車商已經出到那個價，沒有理由讓他多付。

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/actions.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/actions.ts src/engine/actions.test.ts
git commit -m "feat: 撤標與議價決議的人為操作"
```

---

## Task 9: 事件轉通知（TDD）

**Files:**
- Create: `src/engine/notify.ts`
- Test: `src/engine/notify.test.ts`

**Interfaces:**
- Consumes: `EngineEvent` from `@/engine/events`；`EngineData`, `AppNotification`, `User`, `Vehicle` from `@/types`；`highestBid` from `@/engine/rules`；`formatJPY` from `@/lib/money`
- Produces:
  - `eventsToNotifications(args: { events: EngineEvent[]; data: EngineData; users: User[]; now: number; nextId: () => string }): AppNotification[]`

**收件者規則**

| 事件 | 收件者 | 通知類型 |
|---|---|---|
| `STARTED` | 關注者 | `WATCHED_STARTED` |
| `NEW_BID` | 關注者，排除出價者本人 | `WATCHED_NEW_BID` |
| `OUTBID` | 事件指定的車商 | `OUTBID` |
| `EXTENDED` | 出價者 ∪ 關注者 | `EXTENDED` |
| `ENDING_SOON` | 出價者 ∪ 關注者 | `ENDING_SOON` |
| `CLOSED_DEAL` | 得標者 → `WON`；其他出價者 → `LOST`；全體 staff → `AUCTION_CLOSED` |
| `CLOSED_PASSED` | 出價者 → `LOST`；全體 staff → `AUCTION_CLOSED` |
| `NEGOTIATION_INVITE` | 事件指定的車商 | `NEGOTIATION_INVITE` |
| `WITHDRAWN` | 出價者 ∪ 關注者 | `WITHDRAWN` |
| `NO_BID_ALERT` | 全體 staff | `NO_BID_ALERT` |
| `ENDING_BELOW_RESERVE` | 全體 staff | `ENDING_BELOW_RESERVE` |

- [ ] **Step 1: 寫失敗測試**

`src/engine/notify.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { eventsToNotifications } from '@/engine/notify'
import { T0, makeAuction, makeBid, makeData, makeIdGen } from '@/engine/testFixtures'
import type { User } from '@/types'

const users: User[] = [
  { id: 'u-staff', role: 'staff', name: '田中 健一', loginable: true, canSeeReserve: true },
  { id: 'd1', role: 'dealer', name: '山田 太郎', company: '山田商事', loginable: true, canSeeReserve: false },
  { id: 'd2', role: 'dealer', name: '鈴木 一郎', company: '鈴木自動車', loginable: true, canSeeReserve: false },
  { id: 'd3', role: 'dealer', name: '佐藤 次郎', company: '佐藤モータース', loginable: false, canSeeReserve: false },
]

function run(events: Parameters<typeof eventsToNotifications>[0]['events'], data = makeData()) {
  return eventsToNotifications({ events, data, users, now: T0, nextId: makeIdGen() })
}

describe('OUTBID', () => {
  it('只寄給被超越的車商', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'outbid' }])
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ userId: 'd1', type: 'OUTBID', auctionId: 'a1', read: false, at: T0 })
    expect(n[0].title).toBe('您的出價已被超越')
  })

  it('代理上限用盡時內文不同', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'proxy_exhausted' }])
    expect(n[0].body).toContain('已達您設定的代理出價上限')
  })

  it('通知內文含車輛資訊', () => {
    const n = run([{ type: 'OUTBID', auctionId: 'a1', dealerId: 'd1', reason: 'outbid' }])
    expect(n[0].body).toContain('Alphard')
  })
})

describe('關注者相關', () => {
  it('STARTED 寄給關注者', () => {
    const d = makeData({ watches: [{ auctionId: 'a1', dealerId: 'd2' }] })
    const n = run([{ type: 'STARTED', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId)).toEqual(['d2'])
    expect(n[0].type).toBe('WATCHED_STARTED')
  })

  it('NEW_BID 寄給關注者但排除出價者本人', () => {
    const d = makeData({
      watches: [
        { auctionId: 'a1', dealerId: 'd1' },
        { auctionId: 'a1', dealerId: 'd2' },
      ],
    })
    const n = run([{ type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 600_000 }], d)
    expect(n.map((x) => x.userId)).toEqual(['d2'])
    expect(n[0].type).toBe('WATCHED_NEW_BID')
    expect(n[0].body).toContain('¥600,000')
  })

  it('沒有關注者時不產生通知', () => {
    const n = run([{ type: 'NEW_BID', auctionId: 'a1', dealerId: 'd1', amount: 600_000 }])
    expect(n).toEqual([])
  })
})

describe('EXTENDED 與 ENDING_SOON 寄給出價者與關注者的聯集', () => {
  it('出價者與關注者各收一份，不重複', () => {
    const d = makeData({
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 }), makeBid({ dealerId: 'd2', amount: 610_000 })],
      watches: [{ auctionId: 'a1', dealerId: 'd2' }, { auctionId: 'a1', dealerId: 'd3' }],
    })
    const n = run([{ type: 'ENDING_SOON', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId).sort()).toEqual(['d1', 'd2', 'd3'])
  })

  it('EXTENDED 內文含延長分鐘數', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run([{ type: 'EXTENDED', auctionId: 'a1', extendedMs: 180_000 }], d)
    expect(n[0].body).toContain('3 分鐘')
  })
})

describe('結標通知', () => {
  it('CLOSED_DEAL 得標者收 WON、其他出價者收 LOST、staff 收 AUCTION_CLOSED', () => {
    const d = makeData({
      bids: [
        makeBid({ dealerId: 'd1', amount: 2_000_000 }),
        makeBid({ dealerId: 'd2', amount: 1_990_000 }),
      ],
    })
    const n = run([{ type: 'CLOSED_DEAL', auctionId: 'a1', dealerId: 'd1', amount: 2_000_000 }], d)
    const byUser = Object.fromEntries(n.map((x) => [x.userId, x.type]))
    expect(byUser).toEqual({ d1: 'WON', d2: 'LOST', 'u-staff': 'AUCTION_CLOSED' })
    expect(n.find((x) => x.userId === 'd1')!.body).toContain('¥2,000,000')
  })

  it('CLOSED_PASSED 出價者收 LOST、staff 收 AUCTION_CLOSED', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run([{ type: 'CLOSED_PASSED', auctionId: 'a1', reason: '未達底價' }], d)
    const byUser = Object.fromEntries(n.map((x) => [x.userId, x.type]))
    expect(byUser).toEqual({ d1: 'LOST', 'u-staff': 'AUCTION_CLOSED' })
    expect(n.find((x) => x.userId === 'u-staff')!.body).toContain('未達底價')
  })
})

describe('議價與撤標', () => {
  it('NEGOTIATION_INVITE 只寄給被邀請者，內文含金額', () => {
    const n = run([
      { type: 'NEGOTIATION_INVITE', auctionId: 'a1', dealerId: 'd1', amount: 2_000_000 },
    ])
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ userId: 'd1', type: 'NEGOTIATION_INVITE' })
    expect(n[0].body).toContain('¥2,000,000')
  })

  it('WITHDRAWN 寄給出價者與關注者，且內文不含撤標理由', () => {
    const d = makeData({
      auctions: [makeAuction({ status: '已撤標', withdrawReason: '借款人已清償欠款' })],
      bids: [makeBid({ dealerId: 'd1', amount: 600_000 })],
      watches: [{ auctionId: 'a1', dealerId: 'd2' }],
    })
    const n = run([{ type: 'WITHDRAWN', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId).sort()).toEqual(['d1', 'd2'])
    expect(n.every((x) => !x.body.includes('清償'))).toBe(true)
    expect(n[0].body).toContain('已下架')
  })
})

describe('內部通知', () => {
  it('NO_BID_ALERT 只寄給 staff', () => {
    const n = run([{ type: 'NO_BID_ALERT', auctionId: 'a1' }])
    expect(n.map((x) => x.userId)).toEqual(['u-staff'])
  })

  it('ENDING_BELOW_RESERVE 只寄給 staff，內文含差額', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 1_500_000 })] })
    const n = run([{ type: 'ENDING_BELOW_RESERVE', auctionId: 'a1' }], d)
    expect(n.map((x) => x.userId)).toEqual(['u-staff'])
    expect(n[0].body).toContain('¥500,000')
  })
})

describe('id 與排序', () => {
  it('id 來自 nextId，每則不同', () => {
    const d = makeData({ bids: [makeBid({ dealerId: 'd1', amount: 600_000 })] })
    const n = run([{ type: 'ENDING_SOON', auctionId: 'a1' }, { type: 'NO_BID_ALERT', auctionId: 'a1' }], d)
    expect(new Set(n.map((x) => x.id)).size).toBe(n.length)
  })

  it('找不到拍賣的事件被略過而非拋錯', () => {
    const n = run([{ type: 'ENDING_SOON', auctionId: 'nope' }])
    expect(n).toEqual([])
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/engine/notify.test.ts`
Expected: FAIL，無法解析 `@/engine/notify`

- [ ] **Step 3: 實作 `src/engine/notify.ts`**

```ts
import type { EngineEvent } from '@/engine/events'
import { highestBid } from '@/engine/rules'
import { formatJPY } from '@/lib/money'
import type { AppNotification, Auction, EngineData, NotificationType, User, Vehicle } from '@/types'

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
    const bidders = [...new Set(data.bids.filter((b) => b.auctionId === auction.id).map((b) => b.dealerId))]
    const watchers = data.watches.filter((w) => w.auctionId === auction.id).map((w) => w.dealerId)
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
            : `${label} 已有更高出價，目前最高 ${formatJPY(currentPrice(data, auction) ?? auction.startPrice)}。`,
        )
        break

      case 'EXTENDED':
        for (const id of interested) {
          push(
            id,
            'EXTENDED',
            auction.id,
            '結標時間已延長',
            `${label} 因結標前有新出價，結標時間延長 ${Math.round(event.extendedMs / 60_000)} 分鐘。`,
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
          push(id, 'AUCTION_CLOSED', auction.id, '拍賣已流標', `${label} 流標，原因：${event.reason}。`)
        }
        break

      case 'NEGOTIATION_INVITE':
        push(
          event.dealerId,
          'NEGOTIATION_INVITE',
          auction.id,
          '議價邀請',
          `${label} 您的出價未達底價，加價至 ${formatJPY(event.amount)} 即可成交，請於 24 小時內決定。`,
        )
        break

      case 'WITHDRAWN':
        for (const id of interested) {
          push(id, 'WITHDRAWN', auction.id, '拍賣已下架', `${label} 已下架，本次拍賣中止。`)
        }
        break

      case 'NO_BID_ALERT':
        for (const id of staffIds) {
          push(id, 'NO_BID_ALERT', auction.id, '上架 2 天無人出價', `${label} 已上架 2 天仍無人出價。`)
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
```

`WITHDRAWN` 的內文刻意只寫「已下架」，不帶 `withdrawReason`——理由涉及借款人資料，只有公司人員在監控頁看得到。測試明確驗證了這一點。

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/engine/notify.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 執行全部測試**

Run: `npm test && npm run typecheck`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/notify.ts src/engine/notify.test.ts
git commit -m "feat: 事件轉通知（含收件者規則與底價資訊隔離）"
```

---

## Task 10: 虛擬時鐘

**Files:**
- Create: `src/clock/clockStore.ts`, `src/clock/useVirtualNow.ts`
- Test: `src/clock/clockStore.test.ts`

**Interfaces:**
- Consumes: `zustand`
- Produces:
  - `useClock` zustand store：`{ offsetMs: number; speed: number; skip(ms): void; setSpeed(n): void; resetToReal(): void; tick(realDeltaMs): void; virtualNow(): number }`
  - `useVirtualNow(intervalMs?: number): number` —— React hook，預設每 250ms 重算
  - `SPEEDS = [0, 1, 10, 60]`

**設計理由**：時鐘刻意**不經 zustand persist middleware**。tick 每 250ms 執行，若走 persist 會每秒寫 4 次 localStorage。改為由 `clockStore` 自己在 `offsetMs` 變動時節流寫入（2 秒一次）。`speed` 不持久化，重整後一律回到 1x，避免使用者關掉分頁後回來發現時間已經飛掉幾天。

- [ ] **Step 1: 寫失敗測試**

`src/clock/clockStore.test.ts`：

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClock } from '@/clock/clockStore'

const REAL = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(REAL)
  useClock.setState({ offsetMs: 0, speed: 1 })
})

describe('virtualNow', () => {
  it('offset 為 0 時等於真實時間', () => {
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })

  it('skip 會把虛擬時間往前推', () => {
    useClock.getState().skip(600_000)
    expect(useClock.getState().virtualNow()).toBe(REAL + 600_000)
  })

  it('多次 skip 會累加', () => {
    useClock.getState().skip(60_000)
    useClock.getState().skip(60_000)
    expect(useClock.getState().offsetMs).toBe(120_000)
  })

  it('真實時間前進時虛擬時間跟著前進', () => {
    useClock.getState().skip(600_000)
    vi.setSystemTime(REAL + 5_000)
    expect(useClock.getState().virtualNow()).toBe(REAL + 5_000 + 600_000)
  })
})

describe('speed', () => {
  it('1x 時 tick 不改變 offset', () => {
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(0)
  })

  it('10x 時 tick 250ms 讓 offset 增加 2250ms', () => {
    useClock.getState().setSpeed(10)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(2_250)
  })

  it('60x 時 tick 250ms 讓 offset 增加 14750ms', () => {
    useClock.getState().setSpeed(60)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(14_750)
  })

  it('speed 0 為暫停：虛擬時間停在原地', () => {
    useClock.getState().setSpeed(0)
    useClock.getState().tick(250)
    expect(useClock.getState().offsetMs).toBe(-250)
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })

  it('暫停期間真實時間前進，虛擬時間仍不動', () => {
    useClock.getState().setSpeed(0)
    useClock.getState().tick(250)
    vi.setSystemTime(REAL + 250)
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })
})

describe('resetToReal', () => {
  it('清掉 offset 並回到 1x', () => {
    useClock.getState().skip(86_400_000)
    useClock.getState().setSpeed(60)
    useClock.getState().resetToReal()
    expect(useClock.getState().offsetMs).toBe(0)
    expect(useClock.getState().speed).toBe(1)
    expect(useClock.getState().virtualNow()).toBe(REAL)
  })
})
```

「暫停」的實作是把 `offsetMs` 每次 tick 往回扣掉經過的真實時間，這樣 `virtualNow()` 的公式 `Date.now() + offsetMs` 完全不必分支。速度公式統一為 `offsetMs += realDelta * (speed - 1)`：1x 得 0、10x 得 9 倍、0x 得 -1 倍。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/clock/clockStore.test.ts`
Expected: FAIL，無法解析 `@/clock/clockStore`

- [ ] **Step 3: 實作 `src/clock/clockStore.ts`**

```ts
import { create } from 'zustand'

export const SPEEDS = [0, 1, 10, 60] as const

const STORAGE_KEY = 'auction-demo:clock-offset'
const SAVE_THROTTLE_MS = 2_000

function loadOffset(): number {
  if (typeof localStorage === 'undefined') return 0
  const raw = localStorage.getItem(STORAGE_KEY)
  const n = raw === null ? 0 : Number(raw)
  return Number.isFinite(n) ? n : 0
}

let lastSaved = 0
function saveOffset(offsetMs: number, force = false) {
  if (typeof localStorage === 'undefined') return
  const realNow = Date.now()
  if (!force && realNow - lastSaved < SAVE_THROTTLE_MS) return
  lastSaved = realNow
  localStorage.setItem(STORAGE_KEY, String(Math.round(offsetMs)))
}

type ClockState = {
  offsetMs: number
  speed: number
  virtualNow: () => number
  skip: (ms: number) => void
  setSpeed: (speed: number) => void
  resetToReal: () => void
  tick: (realDeltaMs: number) => void
}

export const useClock = create<ClockState>((set, get) => ({
  offsetMs: loadOffset(),
  speed: 1,

  virtualNow: () => Date.now() + get().offsetMs,

  skip: (ms) => {
    const offsetMs = get().offsetMs + ms
    set({ offsetMs })
    saveOffset(offsetMs, true)
  },

  setSpeed: (speed) => set({ speed }),

  resetToReal: () => {
    set({ offsetMs: 0, speed: 1 })
    saveOffset(0, true)
  },

  tick: (realDeltaMs) => {
    const { speed, offsetMs } = get()
    if (speed === 1) return
    const next = offsetMs + realDeltaMs * (speed - 1)
    set({ offsetMs: next })
    saveOffset(next)
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveOffset(useClock.getState().offsetMs, true))
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/clock/clockStore.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 實作 `src/clock/useVirtualNow.ts`**

```ts
import { useEffect, useState } from 'react'
import { useClock } from '@/clock/clockStore'

/**
 * 回傳當前虛擬時間，預設每 250ms 重算。
 * 倒數計時類元件請傳 1000，避免不必要的重繪。
 */
export function useVirtualNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => useClock.getState().virtualNow())

  useEffect(() => {
    const id = setInterval(() => setNow(useClock.getState().virtualNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
```

- [ ] **Step 6: 確認 typecheck 通過**

Run: `npm run typecheck && npm test`
Expected: 皆無錯誤

- [ ] **Step 7: Commit**

```bash
git add src/clock
git commit -m "feat: 虛擬時鐘（加速、暫停、快轉、節流持久化）"
```

---

## Task 11: 假資料與照片

**Files:**
- Create: `src/data/vehicleCatalog.ts`, `src/data/users.ts`, `src/data/images.ts`, `src/data/seed.ts`
- Test: `src/data/seed.test.ts`

**Interfaces:**
- Consumes: `@faker-js/faker`；全部 `@/types`；`nextValidBid`, `bidStepFor` from `@/lib/money`
- Produces:
  - `CATALOG: ReadonlyArray<{ brand: string; models: ReadonlyArray<ModelSpec> }>`
  - `USERS: User[]`，`STAFF_ID`、`DEALER_A_ID`、`DEALER_B_ID`、`ALL_DEALER_IDS`
  - `photoUrl(seed: number, size?: { w: number; h: number }): string`
  - `fallbackPhotoUrl(seed: number): string`
  - `markPhotoServiceDown(): void`、`isPhotoServiceDown(): boolean`
  - `buildSeed(now: number): { data: EngineData; notifications: AppNotification[] }`

- [ ] **Step 1: 建立車款清單 `src/data/vehicleCatalog.ts`**

```ts
import type { BodyType, Drive, Fuel, Transmission } from '@/types'

export type ModelSpec = {
  model: string
  bodyType: BodyType
  fuel: Fuel
  transmission: Transmission
  drive: Drive
  displacement: number
  seats: number
  /** 車齡 0 年時的參考行情，用來推導起標價與底價 */
  basePrice: number
  yearRange: [number, number]
}

export const CATALOG: ReadonlyArray<{ brand: string; models: ReadonlyArray<ModelSpec> }> = [
  {
    brand: 'Toyota',
    models: [
      { model: 'Alphard', bodyType: '七人車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 2493, seats: 7, basePrice: 4_200_000, yearRange: [2016, 2023] },
      { model: 'Prius', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1797, seats: 5, basePrice: 2_600_000, yearRange: [2015, 2022] },
      { model: 'Hiace', bodyType: '商用車', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2755, seats: 3, basePrice: 3_100_000, yearRange: [2014, 2022] },
      { model: 'Corolla Fielder', bodyType: '房車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 5, basePrice: 1_700_000, yearRange: [2014, 2021] },
      { model: 'Land Cruiser Prado', bodyType: 'SUV', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2754, seats: 7, basePrice: 5_400_000, yearRange: [2015, 2023] },
    ],
  },
  {
    brand: 'Nissan',
    models: [
      { model: 'Serena', bodyType: '七人車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1997, seats: 8, basePrice: 2_900_000, yearRange: [2016, 2022] },
      { model: 'Note', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1198, seats: 5, basePrice: 1_800_000, yearRange: [2015, 2022] },
      { model: 'X-Trail', bodyType: 'SUV', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1997, seats: 5, basePrice: 2_800_000, yearRange: [2015, 2022] },
      { model: 'Elgrand', bodyType: '七人車', fuel: '汽油', transmission: 'CVT', drive: 'FR', displacement: 2488, seats: 7, basePrice: 3_300_000, yearRange: [2014, 2021] },
    ],
  },
  {
    brand: 'Honda',
    models: [
      { model: 'N-BOX', bodyType: '輕自動車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 658, seats: 4, basePrice: 1_450_000, yearRange: [2017, 2023] },
      { model: 'Fit', bodyType: '房車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 5, basePrice: 1_900_000, yearRange: [2015, 2022] },
      { model: 'Freed', bodyType: '七人車', fuel: '油電', transmission: 'CVT', drive: 'FF', displacement: 1496, seats: 6, basePrice: 2_300_000, yearRange: [2016, 2022] },
      { model: 'Vezel', bodyType: 'SUV', fuel: '油電', transmission: 'CVT', drive: '4WD', displacement: 1496, seats: 5, basePrice: 2_400_000, yearRange: [2015, 2022] },
    ],
  },
  {
    brand: 'Mazda',
    models: [
      { model: 'CX-5', bodyType: 'SUV', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2188, seats: 5, basePrice: 2_900_000, yearRange: [2015, 2022] },
      { model: 'Demio', bodyType: '房車', fuel: '汽油', transmission: 'AT', drive: 'FF', displacement: 1298, seats: 5, basePrice: 1_500_000, yearRange: [2014, 2021] },
    ],
  },
  {
    brand: 'Subaru',
    models: [
      { model: 'Forester', bodyType: 'SUV', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1995, seats: 5, basePrice: 2_700_000, yearRange: [2015, 2022] },
      { model: 'Impreza', bodyType: '房車', fuel: '汽油', transmission: 'CVT', drive: '4WD', displacement: 1599, seats: 5, basePrice: 1_950_000, yearRange: [2015, 2021] },
    ],
  },
  {
    brand: 'Suzuki',
    models: [
      { model: 'Jimny', bodyType: '輕自動車', fuel: '汽油', transmission: 'MT', drive: '4WD', displacement: 658, seats: 4, basePrice: 1_800_000, yearRange: [2018, 2023] },
      { model: 'Wagon R', bodyType: '輕自動車', fuel: '汽油', transmission: 'CVT', drive: 'FF', displacement: 658, seats: 4, basePrice: 1_150_000, yearRange: [2016, 2022] },
    ],
  },
  {
    brand: 'Mitsubishi',
    models: [
      { model: 'Delica D:5', bodyType: '七人車', fuel: '柴油', transmission: 'AT', drive: '4WD', displacement: 2267, seats: 8, basePrice: 3_400_000, yearRange: [2016, 2022] },
    ],
  },
  {
    brand: 'Lexus',
    models: [
      { model: 'RX', bodyType: 'SUV', fuel: '油電', transmission: 'CVT', drive: '4WD', displacement: 3456, seats: 5, basePrice: 6_200_000, yearRange: [2016, 2022] },
      { model: 'IS', bodyType: '房車', fuel: '汽油', transmission: 'AT', drive: 'FR', displacement: 2494, seats: 5, basePrice: 3_800_000, yearRange: [2015, 2021] },
    ],
  },
]

export const ALL_BRANDS = CATALOG.map((c) => c.brand)

export const COLORS = ['珍珠白', '純白', '銀', '鐵灰', '黑', '深藍', '紅', '香檳金', '墨綠'] as const

export const PLATE_REGIONS = ['品川', '練馬', '横浜', '大阪', '名古屋', '神戸', '札幌', '福岡'] as const

export const PLATE_KANA = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'ら'] as const

export const REMARK_POOL = [
  '定期保養紀錄齊全，原廠保養手冊在車。',
  '左前保險桿有輕微擦傷，已於車體圖標記。',
  '前擋風玻璃右下角有小石擊痕，未擴散。',
  '四輪輪胎於一年內更換，胎紋深度約 6mm。',
  '後座椅面有輕微污損，可清潔處理。',
  '引擎運轉正常，無異音，冷氣功能正常。',
  '車主變更 1 次，無事故紀錄。',
  '底盤有輕微表面鏽蝕，結構無損。',
  '導航主機已升級為市售品，原廠件未保留。',
  '鑰匙 2 把齊全，含備胎與隨車工具。',
] as const

/** 依車齡折舊推導參考行情 */
export function estimateMarketPrice(spec: ModelSpec, year: number, currentYear: number): number {
  const age = Math.max(0, currentYear - year)
  const retained = Math.max(0.28, 0.88 ** age)
  return Math.round((spec.basePrice * retained) / 10_000) * 10_000
}
```

- [ ] **Step 2: 建立使用者 `src/data/users.ts`**

```ts
import type { User } from '@/types'

export const STAFF_ID = 'u-staff'
export const DEALER_A_ID = 'd-yamada'
export const DEALER_B_ID = 'd-suzuki'

export const USERS: User[] = [
  { id: STAFF_ID, role: 'staff', name: '田中 健一', company: '拍賣營運', loginable: true, canSeeReserve: true },
  { id: DEALER_A_ID, role: 'dealer', name: '山田 太郎', company: '山田商事', loginable: true, canSeeReserve: false },
  { id: DEALER_B_ID, role: 'dealer', name: '鈴木 一郎', company: '鈴木自動車', loginable: true, canSeeReserve: false },
  { id: 'd-sato', role: 'dealer', name: '佐藤 次郎', company: '佐藤モータース', loginable: false, canSeeReserve: false },
  { id: 'd-ito', role: 'dealer', name: '伊藤 三郎', company: '伊藤オート', loginable: false, canSeeReserve: false },
  { id: 'd-watanabe', role: 'dealer', name: '渡辺 四郎', company: '渡辺自販', loginable: false, canSeeReserve: false },
]

export const LOGINABLE_USERS = USERS.filter((u) => u.loginable)
export const ALL_DEALER_IDS = USERS.filter((u) => u.role === 'dealer').map((u) => u.id)

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id)
}

/** 車商顯示名稱：公司名優先 */
export function dealerLabel(id: string): string {
  const u = userById(id)
  return u?.company ?? u?.name ?? id
}
```

- [ ] **Step 3: 建立照片模組 `src/data/images.ts`**

```ts
import { faker } from '@faker-js/faker'

let serviceDown = false

export function markPhotoServiceDown(): void {
  serviceDown = true
}

export function isPhotoServiceDown(): boolean {
  return serviceDown
}

/**
 * 車輛照片 URL。
 * 刻意自行組 loremflickr URL，不用 faker.image.urlLoremFlickr()
 * （該 helper 自 v10.1.0 起 deprecated，v11 將移除）。
 * lock 固定，因此同一個 seed 永遠取得同一張圖。
 */
export function photoUrl(seed: number, size: { w: number; h: number } = { w: 640, h: 480 }): string {
  return `https://loremflickr.com/${size.w}/${size.h}/car?lock=${seed}`
}

/** 離線 fallback：純本地 SVG data URI，不發任何請求 */
export function fallbackPhotoUrl(seed: number): string {
  faker.seed(seed)
  return faker.image.dataUri({ width: 640, height: 480 })
}

/** 元件應該呼叫這個：服務掛掉後就直接走 fallback，不再重試 */
export function resolvePhotoUrl(seed: number, size?: { w: number; h: number }): string {
  return serviceDown ? fallbackPhotoUrl(seed) : photoUrl(seed, size)
}
```

- [ ] **Step 4: 寫 seed 的測試（先寫測試，釘住資料組成）**

`src/data/seed.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { advanceAuctions } from '@/engine/advance'
import { buildSeed } from '@/data/seed'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { ALL_DEALER_IDS, STAFF_ID } from '@/data/users'
import type { AuctionStatus } from '@/types'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

function countByStatus(statuses: AuctionStatus[]) {
  return statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
}

describe('buildSeed 資料組成', () => {
  it('產生 26 台車輛，其中 12 台在庫', () => {
    const { data } = buildSeed(NOW)
    expect(data.vehicles).toHaveLength(26)
    expect(data.vehicles.filter((v) => v.status === '在庫')).toHaveLength(12)
  })

  it('產生 14 筆拍賣，狀態分布符合規格', () => {
    const { data } = buildSeed(NOW)
    expect(data.auctions).toHaveLength(14)
    expect(countByStatus(data.auctions.map((a) => a.status))).toEqual({
      未開始: 3,
      進行中: 5,
      議價中: 2,
      已流標: 2,
      已成交: 2,
    })
  })

  it('三種拍賣方式都出現在進行中的拍賣裡', () => {
    const { data } = buildSeed(NOW)
    const live = data.auctions.filter((a) => a.status === '進行中')
    expect(new Set(live.map((a) => a.type))).toEqual(new Set(['SCHEDULED', 'LIVE', 'SEALED']))
  })

  it('每筆拍賣都對應一台存在的車輛，且無重複綁定', () => {
    const { data } = buildSeed(NOW)
    const ids = data.auctions.map((a) => a.vehicleId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(data.vehicles.some((v) => v.id === id)).toBe(true)
    }
  })

  it('車輛狀態與拍賣狀態一致', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions) {
      const v = data.vehicles.find((x) => x.id === a.vehicleId)!
      const expected = {
        未開始: '已排拍',
        進行中: '拍賣中',
        議價中: '拍賣中',
        已成交: '已售出',
        已流標: '在庫',
        已撤標: '已下架',
      }[a.status]
      expect(v.status).toBe(expected)
    }
  })

  it('廠牌都來自車款清單', () => {
    const { data } = buildSeed(NOW)
    for (const v of data.vehicles) {
      expect(ALL_BRANDS).toContain(v.brand)
    }
  })

  it('每台車有 6 張照片 seed', () => {
    const { data } = buildSeed(NOW)
    for (const v of data.vehicles) {
      expect(v.photoSeeds).toHaveLength(6)
    }
  })

  it('底價不低於起標價', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions) {
      expect(a.reservePrice).toBeGreaterThanOrEqual(a.startPrice)
    }
  })

  it('出價都來自已知車商，且不低於起標價', () => {
    const { data } = buildSeed(NOW)
    for (const b of data.bids) {
      expect(ALL_DEALER_IDS).toContain(b.dealerId)
      const a = data.auctions.find((x) => x.id === b.auctionId)!
      expect(b.amount).toBeGreaterThanOrEqual(a.startPrice)
    }
  })
})

describe('buildSeed 示範用的關鍵情境', () => {
  it('有一筆即將結標（10 分鐘內）且有多筆出價的拍賣', () => {
    const { data } = buildSeed(NOW)
    const soon = data.auctions.find(
      (a) => a.status === '進行中' && a.endAt - NOW > 0 && a.endAt - NOW <= 600_000,
    )
    expect(soon).toBeDefined()
    expect(data.bids.filter((b) => b.auctionId === soon!.id).length).toBeGreaterThanOrEqual(5)
  })

  it('有一筆已延長的拍賣', () => {
    const { data } = buildSeed(NOW)
    expect(data.auctions.some((a) => a.extendedMs > 0)).toBe(true)
  })

  it('議價中的拍賣，最高出價低於底價但差距小於 10%', () => {
    const { data } = buildSeed(NOW)
    const negotiating = data.auctions.filter((a) => a.status === '議價中')
    expect(negotiating).toHaveLength(2)
    for (const a of negotiating) {
      expect(a.negotiation).toBeDefined()
      expect(a.negotiation!.deadline).toBeGreaterThan(NOW)
      const top = Math.max(...data.bids.filter((b) => b.auctionId === a.id).map((b) => b.amount))
      expect(top).toBeLessThan(a.reservePrice)
      expect((a.reservePrice - top) / a.reservePrice).toBeLessThan(0.1)
    }
  })

  it('密封投標在結標前有多家投標', () => {
    const { data } = buildSeed(NOW)
    const sealed = data.auctions.find((a) => a.type === 'SEALED' && a.status === '進行中')!
    const bids = data.bids.filter((b) => b.auctionId === sealed.id)
    expect(bids.length).toBeGreaterThanOrEqual(3)
    expect(new Set(bids.map((b) => b.dealerId)).size).toBe(bids.length)
  })

  it('有預設的關注與代理出價', () => {
    const { data } = buildSeed(NOW)
    expect(data.watches.length).toBeGreaterThanOrEqual(3)
    expect(data.proxies.length).toBeGreaterThanOrEqual(3)
  })

  it('已成交的拍賣有 deal，已流標的有 closeReason', () => {
    const { data } = buildSeed(NOW)
    for (const a of data.auctions.filter((x) => x.status === '已成交')) {
      expect(a.deal).toBeDefined()
    }
    for (const a of data.auctions.filter((x) => x.status === '已流標')) {
      expect(a.closeReason).toBeDefined()
    }
  })
})

describe('buildSeed 與引擎的相容性', () => {
  it('剛產生的資料立刻跑一次引擎不會噴出大量事件', () => {
    const { data } = buildSeed(NOW)
    let n = 0
    const r = advanceAuctions(data, NOW, () => `x${++n}`)
    expect(r.events).toEqual([])
    expect(r.changed).toBe(false)
  })

  it('往前快轉 1 小時後即將結標的拍賣會結束', () => {
    const { data } = buildSeed(NOW)
    let n = 0
    const r = advanceAuctions(data, NOW + 3_600_000, () => `x${++n}`)
    expect(r.changed).toBe(true)
    expect(r.events.some((e) => e.type === 'CLOSED_DEAL' || e.type === 'CLOSED_PASSED')).toBe(true)
  })
})

describe('buildSeed 的初始通知', () => {
  it('產生歷史通知，時間都在 now 之前', () => {
    const { notifications } = buildSeed(NOW)
    expect(notifications.length).toBeGreaterThanOrEqual(6)
    for (const n of notifications) {
      expect(n.at).toBeLessThan(NOW)
    }
  })

  it('通知的收件者都是已知使用者', () => {
    const { notifications } = buildSeed(NOW)
    const known = new Set([STAFF_ID, ...ALL_DEALER_IDS])
    for (const n of notifications) {
      expect(known.has(n.userId)).toBe(true)
    }
  })

  it('至少有一則未讀的 OUTBID 給可登入的車商', () => {
    const { notifications } = buildSeed(NOW)
    expect(notifications.some((n) => n.type === 'OUTBID' && !n.read)).toBe(true)
  })
})

describe('buildSeed 決定性', () => {
  it('同一個 now 呼叫兩次得到完全相同的資料', () => {
    expect(buildSeed(NOW)).toEqual(buildSeed(NOW))
  })
})
```

**最重要的一題**是「剛產生的資料立刻跑一次引擎不會噴出大量事件」。`buildSeed` 必須把所有「按時間算已經該發生」的事件鍵預先寫進 `emittedKeys`，否則使用者一開站就會被十幾個 toast 轟炸。

- [ ] **Step 5: 執行測試確認失敗**

Run: `npx vitest run src/data/seed.test.ts`
Expected: FAIL，無法解析 `@/data/seed`

- [ ] **Step 6: 實作 `src/data/seed.ts`**

```ts
import { faker } from '@faker-js/faker'
import {
  BELOW_RESERVE_LEAD_MS,
  ENDING_SOON_LEAD_MS,
  NEGOTIATION_WINDOW_MS,
  NO_BID_ALERT_MS,
} from '@/engine/rules'
import { bidStepFor } from '@/lib/money'
import {
  CATALOG,
  COLORS,
  PLATE_KANA,
  PLATE_REGIONS,
  REMARK_POOL,
  estimateMarketPrice,
  type ModelSpec,
} from '@/data/vehicleCatalog'
import { ALL_DEALER_IDS, DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import type {
  AppNotification,
  Auction,
  AuctionStatus,
  AuctionType,
  Bid,
  EngineData,
  Grade,
  InteriorGrade,
  ProxyBid,
  Vehicle,
  Watch,
} from '@/types'

const SEED = 20260728
const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

const GRADES: Grade[] = ['S', '5', '4.5', '4', '3.5', '3', '2', 'R']
const INTERIOR: InteriorGrade[] = ['A', 'B', 'C', 'D']

/** 拍賣藍圖：由這張表決定 14 筆拍賣長什麼樣，避免邏輯散落 */
type Blueprint = {
  key: string
  type: AuctionType
  status: AuctionStatus
  /** 相對於 now 的開始時間 */
  startOffset: number
  /** 相對於 now 的結標時間 */
  endOffset: number
  /** 出價筆數（密封標為投標家數） */
  bidCount: number
  /** 最高出價相對底價的比例。1 以上表示達到底價 */
  topRatio: number
  extendedMs?: number
  buyNowRatio?: number
  stepMode?: 'auto' | 'fixed'
  fixedStep?: number
}

const BLUEPRINTS: Blueprint[] = [
  // 未開始 3 筆
  { key: 'up-scheduled', type: 'SCHEDULED', status: '未開始', startOffset: 2 * HOUR, endOffset: 2 * HOUR + 4 * DAY, bidCount: 0, topRatio: 0 },
  { key: 'up-live', type: 'LIVE', status: '未開始', startOffset: 30 * MIN, endOffset: 30 * MIN + 90_000, bidCount: 0, topRatio: 0 },
  { key: 'up-sealed', type: 'SEALED', status: '未開始', startOffset: DAY, endOffset: 3 * DAY, bidCount: 0, topRatio: 0, buyNowRatio: 1.18 },

  // 進行中 5 筆
  { key: 'run-normal', type: 'SCHEDULED', status: '進行中', startOffset: -DAY, endOffset: 2 * DAY, bidCount: 5, topRatio: 0.72 },
  { key: 'run-ending-soon', type: 'SCHEDULED', status: '進行中', startOffset: -3 * DAY, endOffset: 8 * MIN, bidCount: 8, topRatio: 0.94 },
  { key: 'run-extended', type: 'SCHEDULED', status: '進行中', startOffset: -4 * DAY, endOffset: 4 * MIN, bidCount: 7, topRatio: 1.04, extendedMs: 9 * MIN },
  { key: 'run-live', type: 'LIVE', status: '進行中', startOffset: -60_000, endOffset: 60_000, bidCount: 3, topRatio: 0.68 },
  { key: 'run-sealed', type: 'SEALED', status: '進行中', startOffset: -DAY, endOffset: 2 * DAY, bidCount: 3, topRatio: 0.88, buyNowRatio: 1.15 },

  // 議價中 2 筆
  { key: 'nego-a', type: 'SCHEDULED', status: '議價中', startOffset: -5 * DAY, endOffset: -4 * HOUR, bidCount: 6, topRatio: 0.94 },
  { key: 'nego-b', type: 'SEALED', status: '議價中', startOffset: -6 * DAY, endOffset: -20 * HOUR, bidCount: 4, topRatio: 0.92 },

  // 已流標 2 筆
  { key: 'passed-nobid', type: 'SCHEDULED', status: '已流標', startOffset: -9 * DAY, endOffset: -2 * DAY, bidCount: 0, topRatio: 0 },
  { key: 'passed-low', type: 'SCHEDULED', status: '已流標', startOffset: -10 * DAY, endOffset: -3 * DAY, bidCount: 4, topRatio: 0.78 },

  // 已成交 2 筆
  { key: 'deal-a', type: 'SCHEDULED', status: '已成交', startOffset: -12 * DAY, endOffset: -5 * DAY, bidCount: 9, topRatio: 1.09 },
  { key: 'deal-b', type: 'SEALED', status: '已成交', startOffset: -14 * DAY, endOffset: -7 * DAY, bidCount: 5, topRatio: 1.02, stepMode: 'fixed', fixedStep: 20_000 },
]

const IN_STOCK_COUNT = 12

export function buildSeed(now: number): { data: EngineData; notifications: AppNotification[] } {
  faker.seed(SEED)

  const currentYear = new Date(now).getFullYear()
  let vehicleSeq = 0
  let orderSeq = 140
  let bidSeq = 0
  let notifySeq = 0

  const flatModels = CATALOG.flatMap((c) => c.models.map((m) => ({ brand: c.brand, spec: m })))

  function makeVehicle(status: Vehicle['status'], createdAt: number) {
    const pick = flatModels[vehicleSeq % flatModels.length]
    const spec: ModelSpec = pick.spec
    const year = faker.number.int({ min: spec.yearRange[0], max: spec.yearRange[1] })
    const id = `v${String(++vehicleSeq).padStart(3, '0')}`
    const market = estimateMarketPrice(spec, year, currentYear)

    const vehicle: Vehicle = {
      id,
      orderNo: `ORD-2026-${String(++orderSeq).padStart(4, '0')}`,
      brand: pick.brand,
      model: spec.model,
      year,
      mileage: faker.number.int({ min: 12, max: 148 }) * 1_000,
      plate: `${faker.helpers.arrayElement(PLATE_REGIONS)} ${faker.number.int({ min: 300, max: 599 })} ${faker.helpers.arrayElement(PLATE_KANA)} ${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 10, max: 99 })}`,
      vin: faker.vehicle.vin(),
      displacement: spec.displacement,
      fuel: spec.fuel,
      transmission: spec.transmission,
      drive: spec.drive,
      color: faker.helpers.arrayElement(COLORS),
      seats: spec.seats,
      bodyType: spec.bodyType,
      grade: faker.helpers.arrayElement(GRADES),
      interiorGrade: faker.helpers.arrayElement(INTERIOR),
      photoSeeds: Array.from({ length: 6 }, () => faker.number.int({ min: 1, max: 99_999 })),
      remarks: faker.helpers.arrayElements(REMARK_POOL, { min: 2, max: 3 }).join(' '),
      loanBalance: Math.round((market * faker.number.float({ min: 0.72, max: 1.24 })) / 10_000) * 10_000,
      status,
      createdAt,
    }
    return { vehicle, market }
  }

  const vehicles: Vehicle[] = []
  const auctions: Auction[] = []
  const bids: Bid[] = []
  const proxies: ProxyBid[] = []
  const watches: Watch[] = []
  const notifications: AppNotification[] = []

  const vehicleStatusFor: Record<AuctionStatus, Vehicle['status']> = {
    未開始: '已排拍',
    進行中: '拍賣中',
    議價中: '拍賣中',
    已成交: '已售出',
    已流標: '在庫',
    已撤標: '已下架',
  }

  for (const bp of BLUEPRINTS) {
    const createdAt = now + bp.startOffset - DAY
    const { vehicle, market } = makeVehicle(vehicleStatusFor[bp.status], createdAt)
    vehicles.push(vehicle)

    const reservePrice = Math.round((market * 0.82) / 10_000) * 10_000
    const startPrice = Math.round((reservePrice * 0.6) / 10_000) * 10_000
    const stepMode = bp.stepMode ?? 'auto'

    const auction: Auction = {
      id: `a-${bp.key}`,
      vehicleId: vehicle.id,
      type: bp.type,
      status: bp.status,
      startAt: now + bp.startOffset,
      endAt: now + bp.endOffset,
      originalEndAt: now + bp.endOffset - (bp.extendedMs ?? 0),
      startPrice,
      reservePrice,
      stepMode,
      fixedStep: bp.fixedStep,
      buyNowPrice: bp.buyNowRatio
        ? Math.round((reservePrice * bp.buyNowRatio) / 10_000) * 10_000
        : undefined,
      extendedMs: bp.extendedMs ?? 0,
      emittedKeys: [],
      createdAt,
    }

    // 產生出價：從起標價往上疊到 topRatio × 底價
    if (bp.bidCount > 0) {
      const target = Math.round((reservePrice * bp.topRatio) / 10_000) * 10_000
      const span = Math.max(0, bp.endOffset - bp.startOffset)

      if (bp.type === 'SEALED') {
        // 密封標：每家一筆，金額彼此獨立，最高者等於 target
        const dealers = faker.helpers.arrayElements(ALL_DEALER_IDS, bp.bidCount)
        dealers.forEach((dealerId, i) => {
          const amount =
            i === 0
              ? target
              : Math.round((target * faker.number.float({ min: 0.7, max: 0.97 })) / 10_000) * 10_000
          bids.push({
            id: `b${String(++bidSeq).padStart(4, '0')}`,
            auctionId: auction.id,
            dealerId,
            amount: Math.max(startPrice, amount),
            at: auction.startAt + Math.round(span * faker.number.float({ min: 0.1, max: 0.8 })),
            kind: 'manual',
          })
        })
      } else {
        // 公開競價：階梯式往上，交錯不同車商，最後一筆為 target
        const ladder: number[] = []
        let price = startPrice
        for (let i = 0; i < bp.bidCount - 1; i++) {
          ladder.push(price)
          price += bidStepFor(price, stepMode, bp.fixedStep)
        }
        ladder.push(Math.max(target, price))

        const pool = faker.helpers.arrayElements(ALL_DEALER_IDS, Math.min(4, ALL_DEALER_IDS.length))
        ladder.forEach((amount, i) => {
          bids.push({
            id: `b${String(++bidSeq).padStart(4, '0')}`,
            auctionId: auction.id,
            dealerId: pool[i % pool.length],
            amount,
            at: auction.startAt + Math.round((span * (i + 1)) / (ladder.length + 1)),
            kind: i > 0 && i % 3 === 0 ? 'proxy' : 'manual',
          })
        })
      }
    }

    const topBid = bids
      .filter((b) => b.auctionId === auction.id)
      .reduce<Bid | null>((best, b) => (!best || b.amount > best.amount ? b : best), null)

    if (bp.status === '已成交' && topBid) {
      auction.deal = { dealerId: topBid.dealerId, amount: topBid.amount, at: auction.endAt }
    }
    if (bp.status === '已流標') {
      auction.closeReason = bp.bidCount === 0 ? '無人出價' : '未達底價'
    }
    if (bp.status === '議價中' && topBid) {
      auction.negotiation = {
        dealerId: topBid.dealerId,
        amount: reservePrice,
        deadline: now + (bp.key === 'nego-a' ? 20 * HOUR : 4 * HOUR),
        declinedDealerIds: [],
      }
    }

    // 預填已經該發生的事件鍵，避免一開站就轟炸
    prefillEmittedKeys(auction, now, topBid?.amount ?? null)

    auctions.push(auction)
  }

  // 在庫車輛
  for (let i = 0; i < IN_STOCK_COUNT; i++) {
    const { vehicle } = makeVehicle('在庫', now - faker.number.int({ min: 1, max: 20 }) * DAY)
    vehicles.push(vehicle)
  }

  // 關注：山田關注 3 筆、鈴木關注 2 筆
  const watchable = auctions.filter((a) => a.status === '進行中' || a.status === '未開始')
  faker.helpers.arrayElements(watchable, 3).forEach((a) => {
    watches.push({ auctionId: a.id, dealerId: DEALER_A_ID })
  })
  faker.helpers.arrayElements(watchable, 2).forEach((a) => {
    watches.push({ auctionId: a.id, dealerId: DEALER_B_ID })
  })

  // 代理出價：3 筆，掛在進行中的公開競價上
  const proxyTargets = auctions
    .filter((a) => a.status === '進行中' && a.type !== 'SEALED')
    .slice(0, 3)
  proxyTargets.forEach((a, i) => {
    const dealerId = [DEALER_A_ID, DEALER_B_ID, 'd-sato'][i]
    proxies.push({
      auctionId: a.id,
      dealerId,
      maxAmount: Math.round((a.reservePrice * 1.06) / 10_000) * 10_000,
      active: true,
      createdAt: a.startAt + HOUR,
    })
  })

  // 歷史通知
  const pushNotification = (
    userId: string,
    type: AppNotification['type'],
    auctionId: string,
    title: string,
    body: string,
    minutesAgo: number,
    read = false,
  ) => {
    notifications.push({
      id: `n${String(++notifySeq).padStart(3, '0')}`,
      userId,
      type,
      auctionId,
      title,
      body,
      at: now - minutesAgo * MIN,
      read,
    })
  }

  const soon = auctions.find((a) => a.id === 'a-run-ending-soon')!
  const extended = auctions.find((a) => a.id === 'a-run-extended')!
  const negoA = auctions.find((a) => a.id === 'a-nego-a')!
  const dealA = auctions.find((a) => a.id === 'a-deal-a')!
  const nobid = auctions.find((a) => a.id === 'a-passed-nobid')!
  const label = (a: Auction) => {
    const v = vehicles.find((x) => x.id === a.vehicleId)!
    return `${v.brand} ${v.model} ${v.year}`
  }

  pushNotification(DEALER_A_ID, 'OUTBID', soon.id, '您的出價已被超越', `${label(soon)} 已有更高出價。`, 12)
  pushNotification(DEALER_A_ID, 'ENDING_SOON', soon.id, '拍賣即將結標', `${label(soon)} 即將結標，請確認您的出價。`, 4)
  pushNotification(DEALER_A_ID, 'EXTENDED', extended.id, '結標時間已延長', `${label(extended)} 因結標前有新出價，結標時間延長 3 分鐘。`, 6)
  pushNotification(DEALER_B_ID, 'WATCHED_NEW_BID', soon.id, '關注的拍賣有新出價', `${label(soon)} 出現新出價。`, 18, true)
  pushNotification(
    negoA.negotiation!.dealerId,
    'NEGOTIATION_INVITE',
    negoA.id,
    '議價邀請',
    `${label(negoA)} 您的出價未達底價，加價後即可成交，請於 24 小時內決定。`,
    240,
  )
  pushNotification(DEALER_A_ID, 'WON', dealA.id, '恭喜得標', `您已得標 ${label(dealA)}。`, 5 * 24 * 60, true)
  pushNotification(STAFF_ID, 'NO_BID_ALERT', nobid.id, '上架 2 天無人出價', `${label(nobid)} 已上架 2 天仍無人出價。`, 3 * 24 * 60, true)
  pushNotification(STAFF_ID, 'ENDING_BELOW_RESERVE', soon.id, '即將結標未達底價', `${label(soon)} 即將結標，目前最高價仍未達底價。`, 30)

  return { data: { vehicles, auctions, bids, proxies, watches }, notifications }
}

/** 把「按時間算已經該發生」的事件鍵預先填入，讓第一次 advance 不產生任何事件 */
function prefillEmittedKeys(auction: Auction, now: number, topAmount: number | null): void {
  const keys: string[] = []
  if (now >= auction.startAt) keys.push('STARTED')

  const remaining = auction.endAt - now
  if (auction.status === '進行中') {
    if (remaining > 0 && remaining <= ENDING_SOON_LEAD_MS) keys.push(`ENDING_SOON:${auction.endAt}`)
    if (remaining > 0 && remaining <= BELOW_RESERVE_LEAD_MS && (topAmount ?? 0) < auction.reservePrice) {
      keys.push(`BELOW_RESERVE:${auction.endAt}`)
    }
    if (topAmount === null && now - auction.startAt >= NO_BID_ALERT_MS) keys.push('NO_BID')
  }
  auction.emittedKeys = keys
}
```

三個容易出錯的點：

1. **`prefillEmittedKeys` 必須用與 `advanceAuctions` 完全相同的鍵格式**（`ENDING_SOON:${endAt}`、`BELOW_RESERVE:${endAt}`、`STARTED`、`NO_BID`）。鍵一旦寫錯，seed 測試的「立刻跑一次引擎不會噴事件」就會失敗。
2. **`originalEndAt = endAt - extendedMs`**，這樣「已延長」的拍賣在 UI 上算得出延長了多久。
3. **議價中的拍賣不能讓 `topRatio ≥ 1`**，否則 `resolveClose` 會判成交而非議價，狀態與 seed 標記不一致。藍圖裡 `nego-a` 用 0.94、`nego-b` 用 0.92，都落在 10% 內。

- [ ] **Step 7: 執行測試，逐一修到通過**

Run: `npx vitest run src/data/seed.test.ts`
Expected: 全部 PASS

若「立刻跑一次引擎不會噴出大量事件」失敗，先把 `r.events` 印出來看是哪個鍵沒對上，再修 `prefillEmittedKeys`。

- [ ] **Step 8: 執行全部測試與 typecheck**

Run: `npm test && npm run typecheck`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add src/data
git commit -m "feat: 假資料（車款清單、使用者、照片 URL、14 筆拍賣藍圖）"
```

---

## Task 12: 主 store 與 selectors

**Files:**
- Create: `src/store/index.ts`, `src/store/selectors.ts`
- Test: `src/store/index.test.ts`, `src/store/selectors.test.ts`

**Interfaces:**
- Consumes: 全部引擎模組、`buildSeed`、`USERS`
- Produces:
  - `useStore` zustand store（欄位與動作見下）
  - `type ActionOutcome = { ok: true } | { ok: false; error: string }`
  - selectors：`currentPrice`、`bidCountOf`、`dealerCountOf`、`anonCodesFor`、`myHighestBid`、`isLeading`、`isWatched`、`activeProxyOf`、`unreadCount`、`notificationsFor`、`filterVehicles`、`filterAuctions`、`auctionView`

**Store 欄位**

```ts
type StoreState = {
  vehicles: Vehicle[]
  auctions: Auction[]
  bids: Bid[]
  proxies: ProxyBid[]
  watches: Watch[]
  notifications: AppNotification[]
  currentUserId: string | null
  idSeq: number
  /** 最後一次由引擎產生通知的 id，ToastBridge 用它判斷哪些是新的 */
  lastNotifiedId: string | null
}
```

**Store 動作**

| 動作 | 簽章 |
|---|---|
| `login` | `(userId: string) => void` |
| `logout` | `() => void` |
| `advance` | `(now: number) => void` |
| `submitBid` | `(args: { auctionId: string; dealerId: string; amount: number; now: number }) => ActionOutcome` |
| `setProxyBid` | `(args: { auctionId: string; dealerId: string; maxAmount: number; now: number }) => ActionOutcome` |
| `cancelProxyBid` | `(args: { auctionId: string; dealerId: string }) => void` |
| `toggleWatch` | `(args: { auctionId: string; dealerId: string }) => void` |
| `saveVehicle` | `(vehicle: Vehicle) => void` |
| `saveAuction` | `(auction: Auction) => ActionOutcome` |
| `withdraw` | `(args: { auctionId: string; reason: string; byUserId: string }) => ActionOutcome` |
| `acceptNegotiationAs` | `(args: { auctionId: string; dealerId: string; now: number }) => ActionOutcome` |
| `declineNegotiationAs` | `(args: { auctionId: string; dealerId: string; now: number }) => ActionOutcome` |
| `acceptHighest` | `(args: { auctionId: string; now: number }) => ActionOutcome` |
| `adjustReservePrice` | `(args: { auctionId: string; reservePrice: number; now: number }) => ActionOutcome` |
| `markRead` | `(notificationId: string) => void` |
| `markAllRead` | `(userId: string) => void` |
| `pushNotification` | `(n: Omit<AppNotification, 'id'>) => void` |
| `forceStatus` | `(args: { auctionId: string; to: 'start' \| 'close' \| 'pass' \| 'negotiate'; now: number }) => ActionOutcome` |
| `replaceAll` | `(next: { data: EngineData; notifications: AppNotification[] }) => void` |
| `reset` | `(now: number) => void` |

- [ ] **Step 1: 寫 store 的測試**

`src/store/index.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '@/store/index'
import { DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import { currentPrice } from '@/store/selectors'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

beforeEach(() => {
  localStorage.clear()
  useStore.getState().reset(NOW)
})

function state() {
  return useStore.getState()
}

describe('reset 與登入', () => {
  it('reset 載入 seed 資料', () => {
    expect(state().auctions).toHaveLength(14)
    expect(state().vehicles).toHaveLength(26)
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
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const before = currentPrice(state(), a.id)!
    const r = state().submitBid({
      auctionId: a.id,
      dealerId: DEALER_A_ID,
      amount: before + 10_000,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(currentPrice(state(), a.id)).toBeGreaterThan(before)
  })

  it('金額不合法時回傳錯誤且不改變資料', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const before = state().bids.length
    const r = state().submitBid({ auctionId: a.id, dealerId: DEALER_A_ID, amount: 1, now: NOW })
    expect(r.ok).toBe(false)
    expect(state().bids).toHaveLength(before)
  })

  it('出價會產生通知給被超越者', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const price = currentPrice(state(), a.id)!
    const leader = state().bids
      .filter((b) => b.auctionId === a.id)
      .reduce((best, b) => (b.amount > best.amount ? b : best)).dealerId
    const other = leader === DEALER_A_ID ? DEALER_B_ID : DEALER_A_ID
    const before = state().notifications.length
    state().submitBid({ auctionId: a.id, dealerId: other, amount: price + 10_000, now: NOW })
    expect(state().notifications.length).toBeGreaterThan(before)
    expect(state().notifications.some((n) => n.userId === leader && n.type === 'OUTBID')).toBe(true)
  })

  it('每次動作產生的 id 都不重複', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    for (let i = 0; i < 5; i++) {
      const price = currentPrice(state(), a.id)!
      state().submitBid({
        auctionId: a.id,
        dealerId: i % 2 === 0 ? DEALER_A_ID : DEALER_B_ID,
        amount: price + 10_000,
        now: NOW + i * 1_000,
      })
    }
    const ids = state().bids.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
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
    expect(state().auctions.find((a) => a.id === 'a-run-ending-soon')!.status).not.toBe('進行中')
  })

  it('重複 advance 同一個時間不重複產生通知', () => {
    state().advance(NOW + 3_600_000)
    const after = state().notifications.length
    state().advance(NOW + 3_600_000)
    expect(state().notifications).toHaveLength(after)
  })
})

describe('代理出價與關注', () => {
  it('setProxyBid 會立刻觸發代理反超', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const price = currentPrice(state(), a.id)!
    const r = state().setProxyBid({
      auctionId: a.id,
      dealerId: DEALER_B_ID,
      maxAmount: price + 500_000,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(currentPrice(state(), a.id)).toBeGreaterThan(price)
  })

  it('代理上限低於合法出價被拒', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const price = currentPrice(state(), a.id)!
    const r = state().setProxyBid({
      auctionId: a.id,
      dealerId: DEALER_B_ID,
      maxAmount: price - 100_000,
      now: NOW,
    })
    expect(r.ok).toBe(false)
  })

  it('同一車商重設代理會覆蓋舊的而非新增', () => {
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    const price = currentPrice(state(), a.id)!
    state().setProxyBid({ auctionId: a.id, dealerId: DEALER_B_ID, maxAmount: price + 200_000, now: NOW })
    const count = state().proxies.filter(
      (p) => p.auctionId === a.id && p.dealerId === DEALER_B_ID,
    ).length
    state().setProxyBid({ auctionId: a.id, dealerId: DEALER_B_ID, maxAmount: price + 400_000, now: NOW })
    expect(
      state().proxies.filter((p) => p.auctionId === a.id && p.dealerId === DEALER_B_ID),
    ).toHaveLength(count)
  })

  it('toggleWatch 可加可移除', () => {
    const a = state().auctions[0]
    const has = () => state().watches.some((w) => w.auctionId === a.id && w.dealerId === DEALER_B_ID)
    const initial = has()
    state().toggleWatch({ auctionId: a.id, dealerId: DEALER_B_ID })
    expect(has()).toBe(!initial)
    state().toggleWatch({ auctionId: a.id, dealerId: DEALER_B_ID })
    expect(has()).toBe(initial)
  })
})

describe('撤標與議價', () => {
  it('撤標成功並產生通知', () => {
    const before = state().notifications.length
    const r = state().withdraw({
      auctionId: 'a-run-normal',
      reason: '借款人已清償欠款',
      byUserId: STAFF_ID,
    })
    expect(r).toEqual({ ok: true })
    expect(state().auctions.find((a) => a.id === 'a-run-normal')!.status).toBe('已撤標')
    expect(state().notifications.length).toBeGreaterThan(before)
  })

  it('撤標理由太短被拒', () => {
    const r = state().withdraw({ auctionId: 'a-run-normal', reason: '不賣', byUserId: STAFF_ID })
    expect(r.ok).toBe(false)
  })

  it('議價對象接受後成交', () => {
    const a = state().auctions.find((x) => x.id === 'a-nego-a')!
    const r = state().acceptNegotiationAs({
      auctionId: a.id,
      dealerId: a.negotiation!.dealerId,
      now: NOW,
    })
    expect(r).toEqual({ ok: true })
    expect(state().auctions.find((x) => x.id === a.id)!.status).toBe('已成交')
  })

  it('公司人員接受最高價後成交金額為最高出價', () => {
    const a = state().auctions.find((x) => x.id === 'a-nego-a')!
    const top = currentPrice(state(), a.id)!
    state().acceptHighest({ auctionId: a.id, now: NOW })
    expect(state().auctions.find((x) => x.id === a.id)!.deal!.amount).toBe(top)
  })
})

describe('forceStatus（Demo 控制台用）', () => {
  it('start 讓未開始的拍賣立刻開標', () => {
    const r = state().forceStatus({ auctionId: 'a-up-scheduled', to: 'start', now: NOW })
    expect(r).toEqual({ ok: true })
    expect(state().auctions.find((a) => a.id === 'a-up-scheduled')!.status).toBe('進行中')
  })

  it('close 讓進行中的拍賣立刻依規則結標', () => {
    state().forceStatus({ auctionId: 'a-run-extended', to: 'close', now: NOW })
    expect(state().auctions.find((a) => a.id === 'a-run-extended')!.status).toBe('已成交')
  })

  it('pass 強制流標', () => {
    state().forceStatus({ auctionId: 'a-run-normal', to: 'pass', now: NOW })
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    expect(a.status).toBe('已流標')
    expect(state().vehicles.find((v) => v.id === a.vehicleId)!.status).toBe('在庫')
  })

  it('negotiate 強制進入議價', () => {
    state().forceStatus({ auctionId: 'a-run-normal', to: 'negotiate', now: NOW })
    const a = state().auctions.find((x) => x.id === 'a-run-normal')!
    expect(a.status).toBe('議價中')
    expect(a.negotiation).toBeDefined()
  })

  it('沒有出價的拍賣不能強制進入議價', () => {
    const r = state().forceStatus({ auctionId: 'a-up-scheduled', to: 'negotiate', now: NOW })
    expect(r.ok).toBe(false)
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/store/index.test.ts`
Expected: FAIL，無法解析 `@/store/index`

若出現 `localStorage is not defined`，把 `vite.config.ts` 的 `test.environment` 改成 `'jsdom'` 並 `npm i -D jsdom`。引擎測試不受影響。

- [ ] **Step 3: 實作 `src/store/index.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed } from '@/data/seed'
import { USERS } from '@/data/users'
import {
  acceptHighestBid,
  acceptNegotiation,
  adjustReserve,
  declineNegotiation,
  withdrawAuction,
  type ActionResult,
} from '@/engine/actions'
import { advanceAuctions } from '@/engine/advance'
import { placeBid } from '@/engine/bid'
import type { EngineEvent } from '@/engine/events'
import { eventsToNotifications } from '@/engine/notify'
import { resolveProxyBids } from '@/engine/proxy'
import { NEGOTIATION_WINDOW_MS, highestBid, resolveClose } from '@/engine/rules'
import { nextValidBid } from '@/lib/money'
import type { AppNotification, Auction, EngineData, ProxyBid, Vehicle } from '@/types'

export type ActionOutcome = { ok: true } | { ok: false; error: string }

const OK: ActionOutcome = { ok: true }
const fail = (error: string): ActionOutcome => ({ ok: false, error })

type StoreState = EngineData & {
  notifications: AppNotification[]
  currentUserId: string | null
  idSeq: number
  lastNotifiedId: string | null

  login: (userId: string) => void
  logout: () => void
  advance: (now: number) => void
  submitBid: (args: { auctionId: string; dealerId: string; amount: number; now: number }) => ActionOutcome
  setProxyBid: (args: { auctionId: string; dealerId: string; maxAmount: number; now: number }) => ActionOutcome
  cancelProxyBid: (args: { auctionId: string; dealerId: string }) => void
  toggleWatch: (args: { auctionId: string; dealerId: string }) => void
  saveVehicle: (vehicle: Vehicle) => void
  saveAuction: (auction: Auction) => ActionOutcome
  withdraw: (args: { auctionId: string; reason: string; byUserId: string }) => ActionOutcome
  acceptNegotiationAs: (args: { auctionId: string; dealerId: string; now: number }) => ActionOutcome
  declineNegotiationAs: (args: { auctionId: string; dealerId: string; now: number }) => ActionOutcome
  acceptHighest: (args: { auctionId: string; now: number }) => ActionOutcome
  adjustReservePrice: (args: { auctionId: string; reservePrice: number; now: number }) => ActionOutcome
  markRead: (notificationId: string) => void
  markAllRead: (userId: string) => void
  pushNotification: (n: Omit<AppNotification, 'id'>) => void
  forceStatus: (args: { auctionId: string; to: 'start' | 'close' | 'pass' | 'negotiate'; now: number }) => ActionOutcome
  replaceAll: (next: { data: EngineData; notifications: AppNotification[] }) => void
  reset: (now: number) => void
}

function dataOf(s: StoreState): EngineData {
  return {
    vehicles: s.vehicles,
    auctions: s.auctions,
    bids: s.bids,
    proxies: s.proxies,
    watches: s.watches,
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** 建立一個以 idSeq 為基準的 id 產生器，回傳 commit 用的最終值 */
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
          lastNotifiedId: notifications.length > 0 ? notifications.at(-1)!.id : s.lastNotifiedId,
        }))
      }

      function runAction(result: ActionResult, now: number, gen: ReturnType<typeof idGen>): ActionOutcome {
        if (result.error) return fail(result.error)
        commit(result.data, result.events, now, gen)
        return OK
      }

      return {
        ...buildSeed(0).data,
        notifications: [],
        currentUserId: null,
        idSeq: 0,
        lastNotifiedId: null,

        login: (userId) => set({ currentUserId: userId }),
        logout: () => set({ currentUserId: null }),

        advance: (now) => {
          const gen = idGen()
          const r = advanceAuctions(dataOf(get()), now, gen.next)
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

        setProxyBid: ({ auctionId, dealerId, maxAmount, now }) => {
          const s = get()
          const auction = s.auctions.find((a) => a.id === auctionId)
          if (!auction) return fail('找不到這筆拍賣')
          if (auction.status !== '進行中') return fail('只有進行中的拍賣可以設定代理出價')
          if (auction.type === 'SEALED') return fail('密封投標不支援代理出價')

          const current = highestBid(s.bids.filter((b) => b.auctionId === auctionId))?.amount ?? null
          const min = nextValidBid(auction, current)
          if (maxAmount < min) return fail(`代理上限至少需為 ${min.toLocaleString('en-US')}`)

          const gen = idGen()
          const proxy: ProxyBid = { auctionId, dealerId, maxAmount, active: true, createdAt: now }
          const proxies = [
            ...s.proxies.filter((p) => !(p.auctionId === auctionId && p.dealerId === dealerId)),
            proxy,
          ]

          const withProxy: EngineData = { ...dataOf(s), proxies }
          const r = resolveProxyBids({
            auction,
            bids: withProxy.bids.filter((b) => b.auctionId === auctionId),
            proxies,
            now,
            nextId: gen.next,
          })

          const events: EngineEvent[] = []
          let nextProxies = proxies
          for (const b of r.newBids) {
            events.push({ type: 'NEW_BID', auctionId, dealerId: b.dealerId, amount: b.amount })
          }
          for (const id of r.outbidDealerIds) {
            events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'outbid' })
          }
          for (const id of r.exhaustedDealerIds) {
            events.push({ type: 'OUTBID', auctionId, dealerId: id, reason: 'proxy_exhausted' })
            nextProxies = nextProxies.map((p) =>
              p.auctionId === auctionId && p.dealerId === id ? { ...p, active: false } : p,
            )
          }

          commit(
            { ...withProxy, proxies: nextProxies, bids: [...withProxy.bids, ...r.newBids] },
            events,
            now,
            gen,
          )
          return OK
        },

        cancelProxyBid: ({ auctionId, dealerId }) =>
          set((s) => ({
            proxies: s.proxies.filter((p) => !(p.auctionId === auctionId && p.dealerId === dealerId)),
          })),

        toggleWatch: ({ auctionId, dealerId }) =>
          set((s) => {
            const exists = s.watches.some((w) => w.auctionId === auctionId && w.dealerId === dealerId)
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

          set((st) => ({
            auctions: existing
              ? st.auctions.map((a) => (a.id === auction.id ? auction : a))
              : [...st.auctions, auction],
            vehicles: st.vehicles.map((v) =>
              v.id === auction.vehicleId && v.status === '在庫' ? { ...v, status: '已排拍' } : v,
            ),
          }))
          return OK
        },

        withdraw: (args) => {
          const gen = idGen()
          return runAction(withdrawAuction(dataOf(get()), args), Date.now(), gen)
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
            notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
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

          if (to === 'start') {
            if (auction.status !== '未開始') return fail('只有未開始的拍賣可以強制開標')
            // 把開始時間拉到現在，交給引擎處理開標與代理進場
            const shifted: Auction = {
              ...auction,
              startAt: now,
              endAt: Math.max(auction.endAt, now + 600_000),
            }
            const data = { ...dataOf(s), auctions: s.auctions.map((a) => (a.id === auctionId ? shifted : a)) }
            const r = advanceAuctions(data, now, gen.next)
            commit(r.data, r.events, now, gen)
            return OK
          }

          if (to === 'close') {
            if (auction.status !== '進行中') return fail('只有進行中的拍賣可以強制結標')
            const shifted: Auction = { ...auction, endAt: now }
            const data = { ...dataOf(s), auctions: s.auctions.map((a) => (a.id === auctionId ? shifted : a)) }
            const r = advanceAuctions(data, now, gen.next)
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
                ...dataOf(s),
                auctions: s.auctions.map((a) => (a.id === auctionId ? next : a)),
                vehicles: s.vehicles.map((v) => (v.id === auction.vehicleId ? { ...v, status: '在庫' } : v)),
              },
              [{ type: 'CLOSED_PASSED', auctionId, reason: next.closeReason! }],
              now,
              gen,
            )
            return OK
          }

          // negotiate
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
            { ...dataOf(s), auctions: s.auctions.map((a) => (a.id === auctionId ? next : a)) },
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
          set({ ...data, notifications, lastNotifiedId: null }),

        reset: (now) => {
          const { data, notifications } = buildSeed(now)
          set({
            ...data,
            notifications,
            currentUserId: null,
            idSeq: 100_000,
            lastNotifiedId: null,
          })
        },
      }
    },
    {
      name: 'auction-demo:store',
      version: 1,
      partialize: (s) => ({
        vehicles: s.vehicles,
        auctions: s.auctions,
        bids: s.bids,
        proxies: s.proxies,
        watches: s.watches,
        notifications: s.notifications,
        currentUserId: s.currentUserId,
        idSeq: s.idSeq,
      }),
    },
  ),
)
```

三個實作要點：

1. **初始 state 用 `buildSeed(0).data`** 只是為了滿足型別；真正的初始化在 `main.tsx` 判斷 localStorage 沒有資料時呼叫 `reset(virtualNow())`。時間相對於「現在」才有意義。
2. **`reset` 把 `idSeq` 設為 100_000**，避開 seed 自己用掉的 `b0001`、`n001` 等前綴，確保新產生的 id 不會撞號。
3. **`forceStatus` 的 `start` 與 `close` 刻意繞回 `advanceAuctions`**，而不是自己改狀態——這樣強制操作走的是完全相同的規則，不會出現「手動結標的結果和自然結標不一致」。

- [ ] **Step 4: 執行測試，修到通過**

Run: `npx vitest run src/store/index.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 寫 selectors 的測試**

`src/store/selectors.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { anonCodesFor, filterAuctions, filterVehicles } from '@/store/selectors'
import { makeBid, makeAuction, makeVehicle } from '@/engine/testFixtures'

describe('anonCodesFor', () => {
  it('依首次出價順序指派 A、B、C', () => {
    const bids = [
      makeBid({ dealerId: 'd3', amount: 100, at: 1 }),
      makeBid({ dealerId: 'd1', amount: 200, at: 2 }),
      makeBid({ dealerId: 'd3', amount: 300, at: 3 }),
      makeBid({ dealerId: 'd2', amount: 400, at: 4 }),
    ]
    const codes = anonCodesFor(bids)
    expect(codes.get('d3')).toBe('出價者 A')
    expect(codes.get('d1')).toBe('出價者 B')
    expect(codes.get('d2')).toBe('出價者 C')
  })

  it('出價陣列順序不影響結果，只看時間', () => {
    const bids = [
      makeBid({ dealerId: 'd2', amount: 400, at: 9 }),
      makeBid({ dealerId: 'd1', amount: 100, at: 1 }),
    ]
    expect(anonCodesFor(bids).get('d1')).toBe('出價者 A')
  })
})

describe('filterVehicles', () => {
  const vehicles = [
    makeVehicle({ id: 'v1', brand: 'Toyota', model: 'Alphard', year: 2019, orderNo: 'ORD-2026-0141', status: '在庫' }),
    makeVehicle({ id: 'v2', brand: 'Honda', model: 'N-BOX', year: 2021, orderNo: 'ORD-2026-0142', status: '在庫' }),
    makeVehicle({ id: 'v3', brand: 'Toyota', model: 'Prius', year: 2016, orderNo: 'ORD-2026-0143', status: '已售出' }),
  ]

  it('無條件時全部回傳', () => {
    expect(filterVehicles(vehicles, {})).toHaveLength(3)
  })
  it('依廠牌篩選（多選）', () => {
    expect(filterVehicles(vehicles, { brands: ['Toyota'] }).map((v) => v.id)).toEqual(['v1', 'v3'])
  })
  it('依年份區間篩選', () => {
    expect(filterVehicles(vehicles, { yearFrom: 2019 }).map((v) => v.id)).toEqual(['v1', 'v2'])
    expect(filterVehicles(vehicles, { yearTo: 2018 }).map((v) => v.id)).toEqual(['v3'])
  })
  it('訂單號為部分比對且不分大小寫', () => {
    expect(filterVehicles(vehicles, { orderNo: '0142' }).map((v) => v.id)).toEqual(['v2'])
    expect(filterVehicles(vehicles, { orderNo: 'ord-2026' })).toHaveLength(3)
  })
  it('依車輛狀態篩選', () => {
    expect(filterVehicles(vehicles, { statuses: ['在庫'] })).toHaveLength(2)
  })
  it('條件可疊加', () => {
    expect(filterVehicles(vehicles, { brands: ['Toyota'], statuses: ['在庫'] }).map((v) => v.id)).toEqual(['v1'])
  })
})

describe('filterAuctions', () => {
  const vehicles = [
    makeVehicle({ id: 'v1', brand: 'Toyota', year: 2019, orderNo: 'ORD-1' }),
    makeVehicle({ id: 'v2', brand: 'Honda', year: 2021, orderNo: 'ORD-2' }),
  ]
  const auctions = [
    makeAuction({ id: 'a1', vehicleId: 'v1', type: 'SCHEDULED', status: '進行中' }),
    makeAuction({ id: 'a2', vehicleId: 'v2', type: 'SEALED', status: '已成交' }),
  ]

  it('依拍賣方式篩選', () => {
    expect(filterAuctions(auctions, vehicles, { types: ['SEALED'] }).map((a) => a.id)).toEqual(['a2'])
  })
  it('依拍賣狀態篩選', () => {
    expect(filterAuctions(auctions, vehicles, { statuses: ['進行中'] }).map((a) => a.id)).toEqual(['a1'])
  })
  it('依車輛條件篩選（廠牌、年份、訂單號）', () => {
    expect(filterAuctions(auctions, vehicles, { brands: ['Honda'] }).map((a) => a.id)).toEqual(['a2'])
    expect(filterAuctions(auctions, vehicles, { yearFrom: 2020 }).map((a) => a.id)).toEqual(['a2'])
    expect(filterAuctions(auctions, vehicles, { orderNo: 'ORD-1' }).map((a) => a.id)).toEqual(['a1'])
  })
  it('找不到對應車輛的拍賣被濾掉', () => {
    const orphan = [makeAuction({ id: 'a9', vehicleId: 'missing' })]
    expect(filterAuctions(orphan, vehicles, { brands: ['Toyota'] })).toHaveLength(0)
  })
})
```

- [ ] **Step 6: 實作 `src/store/selectors.ts`**

```ts
import { highestBid } from '@/engine/rules'
import type {
  AppNotification,
  Auction,
  AuctionStatus,
  AuctionType,
  Bid,
  EngineData,
  ProxyBid,
  Vehicle,
  VehicleStatus,
} from '@/types'

export function bidsOf(data: Pick<EngineData, 'bids'>, auctionId: string): Bid[] {
  return data.bids.filter((b) => b.auctionId === auctionId)
}

export function currentPrice(data: Pick<EngineData, 'bids'>, auctionId: string): number | null {
  return highestBid(bidsOf(data, auctionId))?.amount ?? null
}

export function bidCountOf(data: Pick<EngineData, 'bids'>, auctionId: string): number {
  return bidsOf(data, auctionId).length
}

export function dealerCountOf(data: Pick<EngineData, 'bids'>, auctionId: string): number {
  return new Set(bidsOf(data, auctionId).map((b) => b.dealerId)).size
}

/** 依「該拍賣內首次出價的時間順序」指派匿名代號，代號在該拍賣生命週期內固定 */
export function anonCodesFor(bids: Bid[]): Map<string, string> {
  const firstSeen = new Map<string, number>()
  for (const b of [...bids].sort((x, y) => x.at - y.at)) {
    if (!firstSeen.has(b.dealerId)) firstSeen.set(b.dealerId, b.at)
  }
  const codes = new Map<string, string>()
  let i = 0
  for (const dealerId of firstSeen.keys()) {
    codes.set(dealerId, `出價者 ${String.fromCharCode(65 + i)}`)
    i++
  }
  return codes
}

export function myHighestBid(
  data: Pick<EngineData, 'bids'>,
  auctionId: string,
  dealerId: string,
): Bid | null {
  return highestBid(bidsOf(data, auctionId).filter((b) => b.dealerId === dealerId))
}

export function isLeading(
  data: Pick<EngineData, 'bids'>,
  auctionId: string,
  dealerId: string,
): boolean {
  return highestBid(bidsOf(data, auctionId))?.dealerId === dealerId
}

export function isWatched(
  data: Pick<EngineData, 'watches'>,
  auctionId: string,
  dealerId: string,
): boolean {
  return data.watches.some((w) => w.auctionId === auctionId && w.dealerId === dealerId)
}

export function activeProxyOf(
  data: Pick<EngineData, 'proxies'>,
  auctionId: string,
  dealerId: string,
): ProxyBid | null {
  return (
    data.proxies.find((p) => p.auctionId === auctionId && p.dealerId === dealerId && p.active) ?? null
  )
}

export function notificationsFor(notifications: AppNotification[], userId: string): AppNotification[] {
  return notifications.filter((n) => n.userId === userId).sort((a, b) => b.at - a.at)
}

export function unreadCount(notifications: AppNotification[], userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length
}

export type VehicleFilter = {
  brands?: string[]
  yearFrom?: number
  yearTo?: number
  orderNo?: string
  statuses?: VehicleStatus[]
}

export function filterVehicles(vehicles: Vehicle[], f: VehicleFilter): Vehicle[] {
  const needle = f.orderNo?.trim().toLowerCase()
  return vehicles.filter((v) => {
    if (f.brands?.length && !f.brands.includes(v.brand)) return false
    if (f.yearFrom !== undefined && v.year < f.yearFrom) return false
    if (f.yearTo !== undefined && v.year > f.yearTo) return false
    if (needle && !v.orderNo.toLowerCase().includes(needle)) return false
    if (f.statuses?.length && !f.statuses.includes(v.status)) return false
    return true
  })
}

export type AuctionFilter = VehicleFilter & {
  types?: AuctionType[]
  statuses?: AuctionStatus[]
  /** 只看這些拍賣 id（關注清單、我出價過的） */
  onlyIds?: string[]
}

export function filterAuctions(
  auctions: Auction[],
  vehicles: Vehicle[],
  f: AuctionFilter,
): Auction[] {
  const vehicleFilter: VehicleFilter = {
    brands: f.brands,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
    orderNo: f.orderNo,
  }
  const allowed = new Set(filterVehicles(vehicles, vehicleFilter).map((v) => v.id))

  return auctions.filter((a) => {
    if (!allowed.has(a.vehicleId)) return false
    if (f.types?.length && !f.types.includes(a.type)) return false
    if (f.statuses?.length && !f.statuses.includes(a.status)) return false
    if (f.onlyIds && !f.onlyIds.includes(a.id)) return false
    return true
  })
}
```

注意 `AuctionFilter` 的 `statuses` 型別是 `AuctionStatus[]`，與 `VehicleFilter` 的 `VehicleStatus[]` 衝突，所以 `filterAuctions` 內部組 `vehicleFilter` 時**刻意不傳 `statuses`**——車輛狀態的篩選在拍賣列表沒有意義。

- [ ] **Step 7: 執行全部測試與 typecheck**

Run: `npm test && npm run typecheck`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add src/store
git commit -m "feat: 主 store（引擎整合、通知寫入、強制狀態）與 selectors"
```

---

## Task 13: shadcn、AppShell、路由、登入頁

**Files:**
- Create: `components.json`（由 CLI 產生）、`src/components/ui/*`（由 CLI 產生）
- Create: `src/router.tsx`, `src/components/layout/AppShell.tsx`, `TopBar.tsx`, `SideNav.tsx`, `EngineRunner.tsx`, `ToastBridge.tsx`, `RequireRole.tsx`
- Create: `src/pages/Login.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `useStore`, `useClock`, `useVirtualNow`, `USERS`/`LOGINABLE_USERS`, `notificationsFor`, `unreadCount`
- Produces:
  - `<AppShell>`：頂欄 + 側欄 + `<Outlet />`
  - `useCurrentUser(): User | null`（放在 `src/store/useCurrentUser.ts`）
  - 路由表：`/login`、`/admin/garage`、`/admin/garage/new`、`/admin/garage/:id/edit`、`/admin/auctions`、`/admin/auctions/new`、`/admin/auctions/:id`、`/admin/auctions/:id/edit`、`/dealer/auctions`、`/dealer/auctions/:id`、`/dealer/watchlist`、`/dealer/notifications`

- [ ] **Step 1: 安裝 shadcn 與需要的元件**

```bash
npx shadcn@latest init -d -y
npx shadcn@latest add button card badge input label select textarea checkbox \
  dialog dropdown-menu separator tooltip tabs switch radio-group scroll-area \
  sonner alert skeleton
```

若 CLI 詢問 base color，選 `Neutral`。CLI 會建立 `components.json` 並在 `src/index.css` 補上 shadcn 需要的 CSS 變數；**不要刪掉 Task 1 寫入的 `@theme` 與 body 樣式**，把它們保留在 CLI 產生的內容之後。

- [ ] **Step 2: 確認安裝後專案仍可建置**

Run: `npm run typecheck && npm run build`
Expected: 無錯誤。若 `@/components/ui/*` 解析失敗，檢查 `components.json` 的 `aliases.components` 是否為 `@/components`。

- [ ] **Step 3: 建立 `src/store/useCurrentUser.ts`**

```ts
import { USERS } from '@/data/users'
import { useStore } from '@/store/index'
import type { User } from '@/types'

export function useCurrentUser(): User | null {
  const id = useStore((s) => s.currentUserId)
  if (!id) return null
  return USERS.find((u) => u.id === id) ?? null
}
```

- [ ] **Step 4: 建立引擎驅動器 `src/components/layout/EngineRunner.tsx`**

```tsx
import { useEffect } from 'react'
import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'

const TICK_MS = 250

/**
 * 全站唯一的時間驅動來源。掛在 AppShell 裡，只做兩件事：
 * 1. 推進虛擬時鐘（加速／暫停）
 * 2. 用當前虛擬時間呼叫 store.advance
 *
 * advance 內部在沒有任何變化時不會寫 store，所以這個 250ms 迴圈
 * 在拍賣沒事發生時完全不會造成重繪或 localStorage 寫入。
 */
export function EngineRunner() {
  useEffect(() => {
    const id = setInterval(() => {
      useClock.getState().tick(TICK_MS)
      useStore.getState().advance(useClock.getState().virtualNow())
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
```

- [ ] **Step 5: 建立 toast 橋接 `src/components/layout/ToastBridge.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

/**
 * 只把「屬於當前使用者的新通知」跳成 toast。
 * 其他使用者的通知照樣存在 store，切換角色後在鈴鐺裡看得到。
 */
export function ToastBridge() {
  const user = useCurrentUser()
  const notifications = useStore((s) => s.notifications)
  const navigate = useNavigate()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!user) {
      seen.current = null
      return
    }
    // 第一次掛載（或剛切換使用者）時把現有通知全部標記為已看過，避免一進站就爆一堆 toast
    if (seen.current === null) {
      seen.current = new Set(notifications.map((n) => n.id))
      return
    }
    for (const n of notifications) {
      if (n.userId !== user.id || seen.current.has(n.id)) continue
      seen.current.add(n.id)
      toast(n.title, {
        description: n.body,
        action: {
          label: '查看',
          onClick: () =>
            navigate(user.role === 'staff' ? `/admin/auctions/${n.auctionId}` : `/dealer/auctions/${n.auctionId}`),
        },
      })
    }
  }, [notifications, user, navigate])

  // 切換使用者時重設，讓下一輪重新建立基準
  useEffect(() => {
    seen.current = null
  }, [user?.id])

  return null
}
```

- [ ] **Step 6: 建立側欄 `src/components/layout/SideNav.tsx`**

```tsx
import { Bell, Car, Gavel, PanelLeftClose, PanelLeftOpen, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/index'
import { unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

const COLLAPSE_KEY = 'auction-demo:nav-collapsed'

type Item = { to: string; label: string; icon: typeof Car; badge?: number }

export function SideNav() {
  const user = useCurrentUser()
  const store = useStore()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )

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
```

- [ ] **Step 7: 建立頂欄 `src/components/layout/TopBar.tsx`**

```tsx
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <UserCog className="size-4" />
              <span className="ml-1">
                {user.company ?? user.name}
                <span className="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-xs">
                  {user.role === 'staff' ? '公司人員' : '二手車商'}
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>切換角色</DropdownMenuLabel>
            {LOGINABLE_USERS.map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => switchTo(u.id)} disabled={u.id === user.id}>
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
```

- [ ] **Step 8: 建立 AppShell 與角色守衛**

`src/components/layout/AppShell.tsx`：

```tsx
import { Outlet } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { DemoConsole } from '@/components/demo/DemoConsole'
import { EngineRunner } from './EngineRunner'
import { SideNav } from './SideNav'
import { ToastBridge } from './ToastBridge'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <EngineRunner />
      <ToastBridge />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
      <DemoConsole />
    </div>
  )
}
```

`src/components/layout/RequireRole.tsx`：

```tsx
import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/store/useCurrentUser'
import type { Role } from '@/types'

export function RequireRole({ role }: { role: Role }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'staff' ? '/admin/garage' : '/dealer/auctions'} replace />
  }
  return <Outlet />
}
```

**兩個尚未實作的相依，本 Task 先建立 stub 讓專案能建置：**

`src/components/demo/DemoConsole.tsx`（Task 19 補完）：

```tsx
export function DemoConsole() {
  return null
}
```

`src/components/notifications/NotificationBell.tsx`（Task 18 補完）：

```tsx
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  return (
    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
      <Bell className="size-4" />
    </Button>
  )
}
```

- [ ] **Step 9: 建立登入頁 `src/pages/Login.tsx`**

```tsx
import { Building2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Card } from '@/components/ui/card'
import { LOGINABLE_USERS } from '@/data/users'
import { useStore } from '@/store/index'

const BLURB: Record<string, string> = {
  staff: '管理車庫與拍賣，可查看底價與貸款餘額',
  dealer: '瀏覽拍賣、出價、設定自動出價與關注',
}

export default function Login() {
  const login = useStore((s) => s.login)
  const navigate = useNavigate()

  return (
    <div className="grid min-h-full place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">車輛拍賣平台</h1>
        <p className="mt-1 text-sm text-slate-500">
          這是純前端 Demo，所有資料皆為假資料。點選任一帳號即可進入，不需密碼。
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {LOGINABLE_USERS.map((u) => (
            <Card
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                login(u.id)
                navigate(u.role === 'staff' ? '/admin/garage' : '/dealer/auctions')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
              }}
              className="cursor-pointer p-5 transition hover:border-slate-900 hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-white">
                {u.role === 'staff' ? <ShieldCheck className="size-5" /> : <Building2 className="size-5" />}
              </div>
              <p className="mt-3 font-medium">{u.company ?? u.name}</p>
              <p className="text-sm text-slate-500">{u.name}</p>
              <span className="mt-3 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {u.role === 'staff' ? '公司人員' : '二手車商'}
              </span>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{BLURB[u.role]}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: 建立路由表 `src/router.tsx`**

各頁面元件在後續 Task 才實作。本 Task 先為每個尚未實作的頁面建立一行 placeholder 檔案，內容為：

```tsx
export default function Page() {
  return <p className="text-sm text-slate-500">尚未實作</p>
}
```

需要建立的 placeholder：`src/pages/admin/GarageList.tsx`、`GarageEdit.tsx`、`AuctionList.tsx`、`AuctionEdit.tsx`、`AuctionMonitor.tsx`、`src/pages/dealer/AuctionList.tsx`、`AuctionDetail.tsx`、`Watchlist.tsx`、`Notifications.tsx`。

`src/router.tsx`：

```tsx
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireRole } from '@/components/layout/RequireRole'
import Login from '@/pages/Login'
import AdminAuctionEdit from '@/pages/admin/AuctionEdit'
import AdminAuctionList from '@/pages/admin/AuctionList'
import AdminAuctionMonitor from '@/pages/admin/AuctionMonitor'
import AdminGarageEdit from '@/pages/admin/GarageEdit'
import AdminGarageList from '@/pages/admin/GarageList'
import DealerAuctionDetail from '@/pages/dealer/AuctionDetail'
import DealerAuctionList from '@/pages/dealer/AuctionList'
import DealerNotifications from '@/pages/dealer/Notifications'
import DealerWatchlist from '@/pages/dealer/Watchlist'
import { useCurrentUser } from '@/store/useCurrentUser'

function Home() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'staff' ? '/admin/garage' : '/dealer/auctions'} replace />
}

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route element={<RequireRole role="staff" />}>
          <Route path="/admin/garage" element={<AdminGarageList />} />
          <Route path="/admin/garage/new" element={<AdminGarageEdit />} />
          <Route path="/admin/garage/:id/edit" element={<AdminGarageEdit />} />
          <Route path="/admin/auctions" element={<AdminAuctionList />} />
          <Route path="/admin/auctions/new" element={<AdminAuctionEdit />} />
          <Route path="/admin/auctions/:id" element={<AdminAuctionMonitor />} />
          <Route path="/admin/auctions/:id/edit" element={<AdminAuctionEdit />} />
        </Route>

        <Route element={<RequireRole role="dealer" />}>
          <Route path="/dealer/auctions" element={<DealerAuctionList />} />
          <Route path="/dealer/auctions/:id" element={<DealerAuctionDetail />} />
          <Route path="/dealer/watchlist" element={<DealerWatchlist />} />
          <Route path="/dealer/notifications" element={<DealerNotifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 11: 接上 App 與初始化**

`src/App.tsx`：

```tsx
import { BrowserRouter } from 'react-router'
import { Router } from '@/router'

export default function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  )
}
```

`src/main.tsx` 在 render 前加入首次初始化：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useClock } from '@/clock/clockStore'
import { useStore } from '@/store/index'
import App from './App'
import './index.css'

// 第一次開站（localStorage 沒有資料）時用當前虛擬時間產生 seed
if (useStore.getState().auctions.length === 0 || localStorage.getItem('auction-demo:store') === null) {
  useStore.getState().reset(useClock.getState().virtualNow())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 12: 手動驗證登入與導覽**

Run: `npm run dev`

在瀏覽器確認：

1. `/` 自動導向 `/login`
2. 三張帳號卡都能點進去，公司人員進到 `/admin/garage`、車商進到 `/dealer/auctions`
3. 頂欄顯示虛擬時間並每秒更新
4. 側欄項目依角色不同，數字徽章有值
5. 側欄「收合選單」可切換，重整後維持收合狀態
6. 頂欄下拉可切換角色與登出
7. 直接在網址列輸入 `/admin/garage`（以車商身分）會被導回 `/dealer/auctions`

- [ ] **Step 13: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全部通過

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: shadcn、AppShell、側欄導覽、路由與登入頁"
```

---

## Task 14: 共用展示元件

**Files:**
- Create: `src/components/vehicle/VehiclePhoto.tsx`, `GradeBadge.tsx`, `SpecTable.tsx`
- Create: `src/components/auction/StatusBadge.tsx`, `TypeBadge.tsx`, `Countdown.tsx`, `Money.tsx`, `ReserveHint.tsx`
- Create: `src/components/common/EmptyState.tsx`, `PageHeader.tsx`

**Interfaces:**
- Consumes: `resolvePhotoUrl`, `markPhotoServiceDown`, `fallbackPhotoUrl` from `@/data/images`；`formatJPY`；`formatDuration`；`useVirtualNow`
- Produces:
  - `<VehiclePhoto seed={number} alt={string} className?={string} />`
  - `<GradeBadge grade interiorGrade />`
  - `<SpecTable vehicle showInternal={boolean} />`
  - `<StatusBadge status={AuctionStatus} />`
  - `<TypeBadge type={AuctionType} />`
  - `<Countdown to={number} extendedMs?={number} className?={string} />`
  - `<Money value={number} className?={string} />`
  - `<ReserveHint reservePrice currentPrice />`（僅公司人員頁面使用）
  - `<EmptyState title description action? />`
  - `<PageHeader title description? actions? backTo? />`

- [ ] **Step 1: 照片元件（含離線 fallback）`src/components/vehicle/VehiclePhoto.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { fallbackPhotoUrl, isPhotoServiceDown, markPhotoServiceDown, resolvePhotoUrl } from '@/data/images'
import { cn } from '@/lib/cn'

/**
 * 車輛照片。外部圖片服務失敗時改用本地 SVG，
 * 並記住服務不可用，之後所有照片直接走 fallback 不再重試。
 */
export function VehiclePhoto({
  seed,
  alt,
  className,
  size,
}: {
  seed: number
  alt: string
  className?: string
  size?: { w: number; h: number }
}) {
  const [src, setSrc] = useState(() => resolvePhotoUrl(seed, size))
  const [loaded, setLoaded] = useState(false)

  // 服務中途掛掉後，其他還沒載入的圖片也一起切換
  useEffect(() => {
    setSrc(resolvePhotoUrl(seed, size))
  }, [seed, size])

  return (
    <div className={cn('relative overflow-hidden bg-slate-200', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!isPhotoServiceDown()) markPhotoServiceDown()
          setSrc(fallbackPhotoUrl(seed))
          setLoaded(true)
        }}
        className={cn('size-full object-cover transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}
```

- [ ] **Step 2: 評級徽章 `src/components/vehicle/GradeBadge.tsx`**

```tsx
import { cn } from '@/lib/cn'
import type { Grade, InteriorGrade } from '@/types'

/** 事故車 R 與低評級用警示色，高評級用中性色 */
const TONE: Record<Grade, string> = {
  S: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '5': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '4.5': 'bg-sky-100 text-sky-800 border-sky-200',
  '4': 'bg-sky-100 text-sky-800 border-sky-200',
  '3.5': 'bg-slate-100 text-slate-700 border-slate-200',
  '3': 'bg-slate-100 text-slate-700 border-slate-200',
  '2': 'bg-amber-100 text-amber-800 border-amber-200',
  R: 'bg-rose-100 text-rose-800 border-rose-200',
}

export function GradeBadge({
  grade,
  interiorGrade,
  className,
}: {
  grade: Grade
  interiorGrade?: InteriorGrade
  className?: string
}) {
  return (
    <span
      title={grade === 'R' ? '事故車' : `車體評級 ${grade}`}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        TONE[grade],
        className,
      )}
    >
      {grade}
      {interiorGrade && <span className="font-normal opacity-70">/ {interiorGrade}</span>}
    </span>
  )
}
```

- [ ] **Step 3: 狀態與方式徽章**

`src/components/auction/StatusBadge.tsx`：

```tsx
import { cn } from '@/lib/cn'
import type { AuctionStatus } from '@/types'

const TONE: Record<AuctionStatus, string> = {
  未開始: 'bg-slate-100 text-slate-700 border-slate-200',
  進行中: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  議價中: 'bg-amber-100 text-amber-800 border-amber-200',
  已流標: 'bg-rose-100 text-rose-800 border-rose-200',
  已成交: 'bg-blue-100 text-blue-800 border-blue-200',
  已撤標: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
}

export function StatusBadge({ status, className }: { status: AuctionStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        TONE[status],
        className,
      )}
    >
      {status}
    </span>
  )
}
```

`src/components/auction/TypeBadge.tsx`：

```tsx
import { cn } from '@/lib/cn'
import type { AuctionType } from '@/types'

export const TYPE_LABEL: Record<AuctionType, string> = {
  SCHEDULED: '定時開標',
  LIVE: '即時同步拍',
  SEALED: '密封投標',
}

export const TYPE_HINT: Record<AuctionType, string> = {
  SCHEDULED: '掛數天，期間可隨時出價，看得到目前最高價，結標前有新出價會自動延長 3 分鐘',
  LIVE: '短時間集中競價，每次出價把剩餘時間重設為 15 秒，無人加價即落槌',
  SEALED: '期限內只能投一次，過程中看不到其他人的出價，可設立即成交價',
}

export function TypeBadge({ type, className }: { type: AuctionType; className?: string }) {
  return (
    <span
      title={TYPE_HINT[type]}
      className={cn(
        'inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700',
        className,
      )}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}
```

- [ ] **Step 4: 倒數計時 `src/components/auction/Countdown.tsx`**

```tsx
import { useVirtualNow } from '@/clock/useVirtualNow'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/time'

const URGENT_MS = 300_000

/**
 * 倒數計時。刻意用自己的 1 秒 interval 而非讀 store，
 * 每秒重繪只影響這個元件，不會觸發 store 寫入或整頁重繪。
 */
export function Countdown({
  to,
  extendedMs = 0,
  prefix,
  className,
}: {
  to: number
  extendedMs?: number
  prefix?: string
  className?: string
}) {
  const now = useVirtualNow(1000)
  const remaining = to - now
  const urgent = remaining > 0 && remaining <= URGENT_MS

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      {prefix && <span className="text-xs text-slate-500">{prefix}</span>}
      <span
        className={cn(
          'font-medium tabular-nums',
          urgent && 'animate-pulse text-rose-600',
          remaining <= 0 && 'text-slate-400',
        )}
      >
        {remaining <= 0 ? '已結束' : formatDuration(remaining)}
      </span>
      {extendedMs > 0 && (
        <span
          title={`原定結標時間已往後延 ${Math.round(extendedMs / 60_000)} 分鐘`}
          className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
        >
          已延長 {Math.round(extendedMs / 60_000)} 分
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 5: 金額與底價提示**

`src/components/auction/Money.tsx`：

```tsx
import { cn } from '@/lib/cn'
import { formatJPY } from '@/lib/money'

export function Money({
  value,
  className,
  size = 'md',
}: {
  value: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' }
  return (
    <span className={cn('font-semibold tabular-nums', sizes[size], className)}>
      {formatJPY(value)}
    </span>
  )
}
```

`src/components/auction/ReserveHint.tsx`：

```tsx
import { Lock } from 'lucide-react'
import { formatJPY } from '@/lib/money'
import { cn } from '@/lib/cn'

/**
 * 底價相關資訊。一律帶鎖頭與「內部」底色，
 * 避免示範時被誤解為車商看得到的資訊。
 * 這個元件只能出現在 /admin 頁面。
 */
export function ReserveHint({
  reservePrice,
  currentPrice,
  className,
}: {
  reservePrice: number
  currentPrice: number | null
  className?: string
}) {
  const reached = (currentPrice ?? 0) >= reservePrice
  const gap = reservePrice - (currentPrice ?? 0)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-xs',
        className,
      )}
    >
      <Lock className="size-3 text-slate-400" />
      <span className="text-slate-500">內部</span>
      {reached ? (
        <span className="font-medium text-emerald-700">已達底價</span>
      ) : (
        <span className="font-medium tabular-nums text-amber-700">尚差 {formatJPY(gap)}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 6: 規格表 `src/components/vehicle/SpecTable.tsx`**

```tsx
import { Lock } from 'lucide-react'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { formatJPY } from '@/lib/money'
import type { Vehicle } from '@/types'

export function SpecTable({ vehicle, showInternal }: { vehicle: Vehicle; showInternal: boolean }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['訂單號', vehicle.orderNo],
    ['廠牌 / 車型', `${vehicle.brand} ${vehicle.model}`],
    ['年份', vehicle.year],
    ['里程', `${vehicle.mileage.toLocaleString('en-US')} km`],
    ['車牌', vehicle.plate],
    ['車身號碼', vehicle.vin],
    ['排氣量', `${vehicle.displacement.toLocaleString('en-US')} cc`],
    ['燃料', vehicle.fuel],
    ['變速箱', vehicle.transmission],
    ['驅動方式', vehicle.drive],
    ['車型分類', vehicle.bodyType],
    ['顏色', vehicle.color],
    ['座位數', `${vehicle.seats} 人`],
    ['車況評級', <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />],
  ]

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[8rem_1fr] gap-4 px-4 py-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
        {showInternal && (
          <div className="grid grid-cols-[8rem_1fr] gap-4 bg-slate-50 px-4 py-2">
            <dt className="flex items-center gap-1 text-slate-500">
              <Lock className="size-3" /> 貸款餘額
            </dt>
            <dd className="font-medium tabular-nums">{formatJPY(vehicle.loanBalance)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
```

- [ ] **Step 7: 通用版面元件**

`src/components/common/PageHeader.tsx`：

```tsx
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = '返回列表',
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
```

`src/components/common/EmptyState.tsx`：

```tsx
import { SearchX } from 'lucide-react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
      <SearchX className="size-8 text-slate-300" />
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 8: 手動驗證元件**

暫時把 `src/pages/admin/GarageList.tsx` 改成一個元件展示頁，放入各種狀態的徽章、一張 `VehiclePhoto`、一個 5 分鐘內的 `Countdown`、一個 `ReserveHint`：

Run: `npm run dev`，以公司人員登入後在 `/admin/garage` 確認：

1. 照片能載入（有網路時是真車照）
2. **把網路斷開重整**，照片自動變成本地 SVG，畫面不出現破圖
3. 倒數每秒更新，5 分鐘內轉紅並脈動
4. 六種狀態徽章顏色各異，已撤標有刪除線
5. 拍賣方式徽章 hover 顯示該方式的行為說明

驗證完把 `GarageList.tsx` 還原為 placeholder。

- [ ] **Step 9: 確認建置**

Run: `npm run typecheck && npm run build`
Expected: 無錯誤

- [ ] **Step 10: Commit**

```bash
git add src/components
git commit -m "feat: 共用展示元件（照片 fallback、評級、狀態、倒數、底價提示）"
```

---

## Task 15: 篩選列與車庫列表

**Files:**
- Create: `src/components/filters/useFilterParams.ts`, `src/components/filters/FilterBar.tsx`
- Create: `src/components/vehicle/VehicleCard.tsx`
- Modify: `src/pages/admin/GarageList.tsx`

**Interfaces:**
- Consumes: `filterVehicles`, `VehicleFilter`, `ALL_BRANDS`, `VehiclePhoto`, `GradeBadge`, `EmptyState`, `PageHeader`
- Produces:
  - `useFilterParams<T>(): [T, (patch: Partial<T>) => void, () => void]` —— 把篩選狀態存在 URL query
  - `<FilterBar>` 由 `fields` 陣列驅動，支援 `brands` `year` `orderNo` `select` `toggle` 五種欄位
  - `<VehicleCard vehicle actions? />`

- [ ] **Step 1: 建立 URL query 篩選 hook `src/components/filters/useFilterParams.ts`**

```ts
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * 把篩選條件放在 URL query，好處是可分享連結、上一頁能回到原本的篩選。
 * 陣列用逗號分隔，數字自動轉型。
 */
export function useFilterParams<T extends Record<string, unknown>>(
  spec: { [K in keyof T]: 'string' | 'number' | 'array' },
): [T, (patch: Partial<T>) => void, () => void] {
  const [params, setParams] = useSearchParams()

  const value = useMemo(() => {
    const out: Record<string, unknown> = {}
    for (const [key, kind] of Object.entries(spec)) {
      const raw = params.get(key)
      if (raw === null || raw === '') continue
      if (kind === 'array') out[key] = raw.split(',').filter(Boolean)
      else if (kind === 'number') {
        const n = Number(raw)
        if (Number.isFinite(n)) out[key] = n
      } else out[key] = raw
    }
    return out as T
  }, [params, spec])

  const patch = useCallback(
    (next: Partial<T>) => {
      const merged = new URLSearchParams(params)
      for (const [key, v] of Object.entries(next)) {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          merged.delete(key)
        } else {
          merged.set(key, Array.isArray(v) ? v.join(',') : String(v))
        }
      }
      setParams(merged, { replace: true })
    },
    [params, setParams],
  )

  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return [value, patch, clear]
}
```

- [ ] **Step 2: 建立篩選列 `src/components/filters/FilterBar.tsx`**

```tsx
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'

export type FilterField =
  | { kind: 'multi'; key: string; label: string; options: Array<{ value: string; label: string }> }
  | { kind: 'number'; key: string; label: string; placeholder?: string }
  | { kind: 'text'; key: string; label: string; placeholder?: string }
  | { kind: 'toggle'; key: string; label: string }

export function FilterBar({
  fields,
  value,
  onPatch,
  onClear,
  resultCount,
}: {
  fields: FilterField[]
  value: Record<string, unknown>
  onPatch: (patch: Record<string, unknown>) => void
  onClear: () => void
  resultCount: number
}) {
  const hasAny = fields.some((f) => {
    const v = value[f.key]
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ''
  })

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        {fields.map((field) => {
          if (field.kind === 'multi') {
            const selected = (value[field.key] as string[] | undefined) ?? []
            return (
              <div key={field.key} className="min-w-0">
                <Label className="mb-1.5 block text-xs text-slate-500">{field.label}</Label>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((o) => {
                    const on = selected.includes(o.value)
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          onPatch({
                            [field.key]: on
                              ? selected.filter((s) => s !== o.value)
                              : [...selected, o.value],
                          })
                        }
                        className={cn(
                          'rounded border px-2 py-1 text-xs transition',
                          on
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                        )}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          }

          if (field.kind === 'toggle') {
            const on = value[field.key] === '1'
            return (
              <div key={field.key}>
                <Label className="mb-1.5 block text-xs text-slate-500">&nbsp;</Label>
                <button
                  type="button"
                  onClick={() => onPatch({ [field.key]: on ? undefined : '1' })}
                  className={cn(
                    'rounded border px-3 py-1.5 text-xs transition',
                    on
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                  )}
                >
                  {field.label}
                </button>
              </div>
            )
          }

          return (
            <div key={field.key} className="w-36">
              <Label htmlFor={field.key} className="mb-1.5 block text-xs text-slate-500">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type={field.kind === 'number' ? 'number' : 'text'}
                placeholder={field.placeholder}
                value={(value[field.key] as string | number | undefined) ?? ''}
                onChange={(e) => onPatch({ [field.key]: e.target.value })}
                className="h-8"
              />
            </div>
          )
        })}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm tabular-nums text-slate-500">{resultCount} 筆</span>
          {hasAny && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-1 size-3" /> 清除篩選
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 建立車輛卡片 `src/components/vehicle/VehicleCard.tsx`**

```tsx
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import type { Vehicle } from '@/types'

const STATUS_TONE: Record<Vehicle['status'], string> = {
  在庫: 'bg-slate-100 text-slate-700',
  已排拍: 'bg-sky-100 text-sky-800',
  拍賣中: 'bg-emerald-100 text-emerald-800',
  已售出: 'bg-blue-100 text-blue-800',
  已下架: 'bg-slate-100 text-slate-500 line-through',
}

export function VehicleCard({ vehicle, actions }: { vehicle: Vehicle; actions?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0">
      <VehiclePhoto seed={vehicle.photoSeeds[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-medium leading-tight">
            {vehicle.brand} {vehicle.model}
            <span className="ml-1.5 text-sm text-slate-500 tabular-nums">{vehicle.year}</span>
          </p>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs', STATUS_TONE[vehicle.status])}>
            {vehicle.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />
          <span className="tabular-nums">{vehicle.mileage.toLocaleString('en-US')} km</span>
          <span>{vehicle.bodyType}</span>
        </div>

        <p className="font-mono text-xs text-slate-400">{vehicle.orderNo}</p>

        {actions && <div className="mt-auto flex gap-2 pt-2">{actions}</div>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: 實作車庫列表 `src/pages/admin/GarageList.tsx`**

```tsx
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { Button } from '@/components/ui/button'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { useStore } from '@/store/index'
import { filterVehicles } from '@/store/selectors'
import type { VehicleStatus } from '@/types'

const STATUSES: VehicleStatus[] = ['在庫', '已排拍', '拍賣中', '已售出', '已下架']

type Query = {
  brands?: string[]
  statuses?: string[]
  yearFrom?: number
  yearTo?: number
  orderNo?: string
  sort?: string
}

const FIELDS: FilterField[] = [
  { kind: 'multi', key: 'brands', label: '廠牌', options: ALL_BRANDS.map((b) => ({ value: b, label: b })) },
  { kind: 'multi', key: 'statuses', label: '狀態', options: STATUSES.map((s) => ({ value: s, label: s })) },
  { kind: 'number', key: 'yearFrom', label: '年份起', placeholder: '2016' },
  { kind: 'number', key: 'yearTo', label: '年份迄', placeholder: '2023' },
  { kind: 'text', key: 'orderNo', label: '訂單號', placeholder: 'ORD-2026' },
]

export default function GarageList() {
  const vehicles = useStore((s) => s.vehicles)
  const navigate = useNavigate()
  const [query, patch, clear] = useFilterParams<Query>({
    brands: 'array',
    statuses: 'array',
    yearFrom: 'number',
    yearTo: 'number',
    orderNo: 'string',
    sort: 'string',
  })

  const results = useMemo(() => {
    const filtered = filterVehicles(vehicles, {
      brands: query.brands,
      statuses: query.statuses as VehicleStatus[] | undefined,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      orderNo: query.orderNo,
    })
    const sorted = [...filtered]
    if (query.sort === 'year') sorted.sort((a, b) => b.year - a.year)
    else if (query.sort === 'mileage') sorted.sort((a, b) => a.mileage - b.mileage)
    else sorted.sort((a, b) => b.createdAt - a.createdAt)
    return sorted
  }, [vehicles, query])

  return (
    <>
      <PageHeader
        title="車庫管理"
        description="回收車輛的入庫清單。狀態為「在庫」的車輛才能排定拍賣。"
        actions={
          <>
            <select
              value={query.sort ?? 'newest'}
              onChange={(e) => patch({ sort: e.target.value === 'newest' ? undefined : e.target.value })}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="newest">最新入庫</option>
              <option value="year">年份由新到舊</option>
              <option value="mileage">里程由低到高</option>
            </select>
            <Button asChild>
              <Link to="/admin/garage/new">
                <Plus className="mr-1 size-4" /> 新增車輛
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar fields={FIELDS} value={query} onPatch={patch} onClear={clear} resultCount={results.length} />

      {results.length === 0 ? (
        <EmptyState
          title="沒有符合條件的車輛"
          description="調整或清除篩選條件後再試一次。"
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              actions={
                <>
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/admin/garage/${v.id}/edit`}>編輯</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={v.status !== '在庫'}
                    onClick={() => navigate(`/admin/auctions/new?vehicleId=${v.id}`)}
                  >
                    排拍
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`，以公司人員登入後在 `/admin/garage` 確認：

1. 26 台車以 gallery 呈現，響應式 1/2/3/4 欄
2. 點「Toyota」只留 Toyota 的車，右側筆數同步變化
3. 年份起填 2019 → 只留 2019 年以後
4. 訂單號填 `0142` → 只留一筆；填 `ORD` → 全部保留
5. **重整頁面，篩選條件仍在**（存在 URL query）
6. 篩到 0 筆時顯示空狀態與清除按鈕
7. 排序下拉三種都會改變順序
8. 「排拍」按鈕在非「在庫」的車上是 disabled

- [ ] **Step 6: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/filters src/components/vehicle src/pages/admin/GarageList.tsx
git commit -m "feat: 篩選列（URL query）與車庫列表"
```

---

## Task 16: 車庫上架編輯表單

**Files:**
- Modify: `src/pages/admin/GarageEdit.tsx`
- Create: `src/components/vehicle/PhotoGrid.tsx`, `src/lib/id.ts`

**Interfaces:**
- Consumes: `useStore().saveVehicle`、`CATALOG`、`COLORS`、`GRADES`、`VehiclePhoto`
- Produces:
  - `newId(prefix: string): string` in `src/lib/id.ts`
  - `<PhotoGrid seeds onChange />`

- [ ] **Step 1: 建立 id 產生器 `src/lib/id.ts`**

```ts
let counter = 0

/** 供 UI 建立新實體用。引擎內部一律用注入的 nextId，不用這個。 */
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter.toString(36)}-${Math.floor(performance.now()).toString(36)}`
}
```

- [ ] **Step 2: 建立照片網格 `src/components/vehicle/PhotoGrid.tsx`**

```tsx
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'

/** Demo 不做真上傳：照片由 seed 決定，可整組重抽或單張刪除 */
export function PhotoGrid({
  seeds,
  onChange,
}: {
  seeds: number[]
  onChange: (next: number[]) => void
}) {
  const regenerate = () => {
    onChange(Array.from({ length: 6 }, () => Math.floor(Math.random() * 99_999) + 1))
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {seeds.map((seed, i) => (
          <div key={`${seed}-${i}`} className="group relative">
            <VehiclePhoto seed={seed} alt={`照片 ${i + 1}`} className="aspect-[4/3] rounded" />
            <button
              type="button"
              onClick={() => onChange(seeds.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 hidden rounded bg-slate-900/80 p-1 text-white group-hover:block"
              aria-label={`刪除照片 ${i + 1}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={regenerate}>
          <RefreshCw className="mr-1 size-3" /> 重新產生照片
        </Button>
        <span className="text-xs text-slate-500">
          Demo 不提供上傳，照片由假圖服務產生。共 {seeds.length} 張。
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 實作 `src/pages/admin/GarageEdit.tsx`**

表單分五區塊，用原生 `<form>` + 受控 state，不引入表單套件。

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhotoGrid } from '@/components/vehicle/PhotoGrid'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { CATALOG, COLORS } from '@/data/vehicleCatalog'
import { newId } from '@/lib/id'
import { useStore } from '@/store/index'
import type { BodyType, Drive, Fuel, Grade, InteriorGrade, Transmission, Vehicle } from '@/types'

const GRADES: Grade[] = ['S', '5', '4.5', '4', '3.5', '3', '2', 'R']
const INTERIOR: InteriorGrade[] = ['A', 'B', 'C', 'D']
const FUELS: Fuel[] = ['汽油', '柴油', '油電', '電動']
const TRANSMISSIONS: Transmission[] = ['AT', 'MT', 'CVT']
const DRIVES: Drive[] = ['FF', 'FR', '4WD']
const BODY_TYPES: BodyType[] = ['房車', 'SUV', '七人車', '輕自動車', '商用車']

function blank(): Vehicle {
  return {
    id: newId('v'),
    orderNo: '',
    brand: CATALOG[0].brand,
    model: CATALOG[0].models[0].model,
    year: new Date().getFullYear() - 5,
    mileage: 50_000,
    plate: '',
    vin: '',
    displacement: 1500,
    fuel: '汽油',
    transmission: 'CVT',
    drive: 'FF',
    color: COLORS[0],
    seats: 5,
    bodyType: '房車',
    grade: '4',
    interiorGrade: 'B',
    photoSeeds: Array.from({ length: 6 }, () => Math.floor(Math.random() * 99_999) + 1),
    remarks: '',
    loanBalance: 1_000_000,
    status: '在庫',
    createdAt: Date.now(),
  }
}

export default function GarageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const saveVehicle = useStore((s) => s.saveVehicle)

  const existing = id ? vehicles.find((v) => v.id === id) : undefined
  const [form, setForm] = useState<Vehicle>(() => existing ?? blank())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)

  const models = useMemo(
    () => CATALOG.find((c) => c.brand === form.brand)?.models ?? [],
    [form.brand],
  )

  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!form.orderNo.trim()) next.orderNo = '請填寫訂單號'
    if (!form.plate.trim()) next.plate = '請填寫車牌'
    if (!form.vin.trim()) next.vin = '請填寫車身號碼'
    if (form.year < 1990 || form.year > new Date().getFullYear() + 1) next.year = '年份不合理'
    if (form.mileage < 0) next.mileage = '里程不得為負'
    if (form.photoSeeds.length === 0) next.photoSeeds = '至少需要一張照片'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit() {
    saveVehicle(form)
    toast.success(existing ? '車輛資料已更新' : '車輛已新增至車庫')
    navigate('/admin/garage')
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={existing ? '編輯車輛' : '新增車輛'}
        description="車商看得到除「內部資訊」以外的所有欄位。"
        backTo="/admin/garage"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (validate()) setPreview(true)
        }}
        className="space-y-4"
      >
        <Section title="基本資料">
          <Field label="訂單號" error={errors.orderNo}>
            <Input value={form.orderNo} onChange={(e) => set('orderNo', e.target.value)} placeholder="ORD-2026-0001" />
          </Field>
          <Field label="廠牌">
            <Select
              value={form.brand}
              options={CATALOG.map((c) => c.brand)}
              onChange={(v) => {
                const first = CATALOG.find((c) => c.brand === v)!.models[0]
                setForm((f) => ({
                  ...f,
                  brand: v,
                  model: first.model,
                  bodyType: first.bodyType,
                  fuel: first.fuel,
                  transmission: first.transmission,
                  drive: first.drive,
                  displacement: first.displacement,
                  seats: first.seats,
                }))
              }}
            />
          </Field>
          <Field label="車型">
            <Select value={form.model} options={models.map((m) => m.model)} onChange={(v) => set('model', v)} />
          </Field>
          <Field label="年份" error={errors.year}>
            <Input type="number" value={form.year} onChange={(e) => set('year', Number(e.target.value))} />
          </Field>
          <Field label="車牌" error={errors.plate}>
            <Input value={form.plate} onChange={(e) => set('plate', e.target.value)} placeholder="品川 330 あ 12-34" />
          </Field>
          <Field label="車身號碼" error={errors.vin}>
            <Input value={form.vin} onChange={(e) => set('vin', e.target.value)} />
          </Field>
        </Section>

        <Section title="規格">
          <Field label="里程 (km)" error={errors.mileage}>
            <Input type="number" value={form.mileage} onChange={(e) => set('mileage', Number(e.target.value))} />
          </Field>
          <Field label="排氣量 (cc)">
            <Input type="number" value={form.displacement} onChange={(e) => set('displacement', Number(e.target.value))} />
          </Field>
          <Field label="燃料">
            <Select value={form.fuel} options={FUELS} onChange={(v) => set('fuel', v as Fuel)} />
          </Field>
          <Field label="變速箱">
            <Select value={form.transmission} options={TRANSMISSIONS} onChange={(v) => set('transmission', v as Transmission)} />
          </Field>
          <Field label="驅動方式">
            <Select value={form.drive} options={DRIVES} onChange={(v) => set('drive', v as Drive)} />
          </Field>
          <Field label="顏色">
            <Select value={form.color} options={[...COLORS]} onChange={(v) => set('color', v)} />
          </Field>
          <Field label="座位數">
            <Input type="number" value={form.seats} onChange={(e) => set('seats', Number(e.target.value))} />
          </Field>
          <Field label="車型分類">
            <Select value={form.bodyType} options={BODY_TYPES} onChange={(v) => set('bodyType', v as BodyType)} />
          </Field>
        </Section>

        <Section title="車況">
          <Field label="車體評級">
            <Select value={form.grade} options={GRADES} onChange={(v) => set('grade', v as Grade)} />
          </Field>
          <Field label="內裝評級">
            <Select value={form.interiorGrade} options={INTERIOR} onChange={(v) => set('interiorGrade', v as InteriorGrade)} />
          </Field>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-sm">備註</Label>
            <Textarea rows={3} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </div>
        </Section>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">照片</h2>
          <PhotoGrid seeds={form.photoSeeds} onChange={(next) => set('photoSeeds', next)} />
          {errors.photoSeeds && <p className="mt-2 text-xs text-rose-600">{errors.photoSeeds}</p>}
        </Card>

        <Card className="border-dashed bg-slate-50 p-4">
          <h2 className="mb-1 text-sm font-semibold">內部資訊</h2>
          <p className="mb-3 text-xs text-slate-500">此區塊不會顯示給車商。</p>
          <Field label="貸款未償餘額">
            <Input type="number" value={form.loanBalance} onChange={(e) => set('loanBalance', Number(e.target.value))} />
          </Field>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/garage')}>
            取消
          </Button>
          <Button type="submit">預覽並儲存</Button>
        </div>
      </form>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>將以此內容顯示給車商</DialogTitle>
            <DialogDescription>「內部資訊」區塊的貸款餘額不會出現在車商端。</DialogDescription>
          </DialogHeader>
          <SpecTable vehicle={form} showInternal={false} />
          {form.remarks && <p className="text-sm text-slate-600">{form.remarks}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(false)}>
              返回修改
            </Button>
            <Button onClick={submit}>確認儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
```

用原生 `<select>` 而非 shadcn 的 `Select`，是因為這張表單有十幾個下拉，原生元素在密集表單裡更快也更容易鍵盤操作；shadcn 的 `Select` 留給少量、需要搭配 icon 的場合。

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`

1. `/admin/garage/new` 表單五區塊都在，「內部資訊」有虛線邊框與灰底
2. 訂單號留空按「預覽並儲存」→ 顯示欄位錯誤，不開 Dialog
3. 填完必填 → 開預覽 Dialog，**預覽內容不含貸款餘額**
4. 「確認儲存」後回到列表，新車出現在最前面（最新入庫排序）
5. 切換廠牌時車型清單跟著換，且規格欄位自動帶入該車型的預設值
6. 「重新產生照片」換一組圖；單張 hover 出現刪除鈕，刪到 0 張時儲存被擋
7. 從列表點既有車輛的「編輯」→ 欄位帶入原值，儲存後列表更新

- [ ] **Step 5: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/lib/id.ts src/components/vehicle/PhotoGrid.tsx src/pages/admin/GarageEdit.tsx
git commit -m "feat: 車庫上架編輯表單（含車商視角預覽）"
```

---

## Task 17: 拍賣卡片與公司端拍賣列表

**Files:**
- Create: `src/components/auction/AuctionCard.tsx`
- Modify: `src/pages/admin/AuctionList.tsx`

**Interfaces:**
- Consumes: `filterAuctions`、`currentPrice`、`bidCountOf`、`StatusBadge`、`TypeBadge`、`Countdown`、`ReserveHint`、`Money`
- Produces:
  - `<AuctionCard auction vehicle viewer footer? to />`
    - `viewer: { kind: 'staff' } | { kind: 'dealer'; dealerId: string }`
    - staff 看得到 `ReserveHint`；dealer 看不到，改顯示領先／被超越標記

- [ ] **Step 1: 建立拍賣卡片 `src/components/auction/AuctionCard.tsx`**

```tsx
import { Star } from 'lucide-react'
import { Link } from 'react-router'
import { Countdown } from '@/components/auction/Countdown'
import { Money } from '@/components/auction/Money'
import { ReserveHint } from '@/components/auction/ReserveHint'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { Card } from '@/components/ui/card'
import { GradeBadge } from '@/components/vehicle/GradeBadge'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { bidCountOf, currentPrice, isLeading, isWatched, myHighestBid } from '@/store/selectors'
import type { Auction, Vehicle } from '@/types'

export type CardViewer = { kind: 'staff' } | { kind: 'dealer'; dealerId: string }

export function AuctionCard({
  auction,
  vehicle,
  viewer,
  to,
  footer,
}: {
  auction: Auction
  vehicle: Vehicle
  viewer: CardViewer
  to: string
  footer?: React.ReactNode
}) {
  const store = useStore()
  const price = currentPrice(store, auction.id)
  const bids = bidCountOf(store, auction.id)
  const sealedBefore = auction.type === 'SEALED' && (auction.status === '進行中' || auction.status === '未開始')

  const dealerId = viewer.kind === 'dealer' ? viewer.dealerId : null
  const leading = dealerId ? isLeading(store, auction.id, dealerId) : false
  const mine = dealerId ? myHighestBid(store, auction.id, dealerId) : null
  const watched = dealerId ? isWatched(store, auction.id, dealerId) : false

  return (
    <Card
      className={cn(
        'flex flex-col gap-0 overflow-hidden p-0 transition hover:shadow-md',
        auction.status === '已撤標' && 'opacity-60 saturate-50',
      )}
    >
      <Link to={to} className="relative block">
        <VehiclePhoto
          seed={vehicle.photoSeeds[0]}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="aspect-[4/3]"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          <StatusBadge status={auction.status} className="shadow-sm" />
        </div>
        {watched && (
          <Star className="absolute right-2 top-2 size-5 fill-amber-400 text-amber-500 drop-shadow" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={to} className="min-w-0">
          <p className="font-medium leading-tight hover:underline">
            {vehicle.brand} {vehicle.model}
            <span className="ml-1.5 text-sm tabular-nums text-slate-500">{vehicle.year}</span>
          </p>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <GradeBadge grade={vehicle.grade} interiorGrade={vehicle.interiorGrade} />
          <span className="tabular-nums">{vehicle.mileage.toLocaleString('en-US')} km</span>
          <TypeBadge type={auction.type} />
        </div>

        <p className="font-mono text-xs text-slate-400">{vehicle.orderNo}</p>

        <div className="mt-1 border-t border-slate-100 pt-2">
          {auction.status === '已成交' && auction.deal ? (
            <div>
              <p className="text-xs text-slate-500">結標金額</p>
              <Money value={auction.deal.amount} size="lg" className="text-blue-700" />
            </div>
          ) : auction.status === '已流標' ? (
            <div className="flex items-center justify-between">
              <span className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                流標 · {auction.closeReason}
              </span>
              {price !== null && <span className="text-xs tabular-nums text-slate-500">最高 {price.toLocaleString('en-US')}</span>}
            </div>
          ) : auction.status === '已撤標' ? (
            <span className="text-xs text-slate-500">已下架</span>
          ) : sealedBefore ? (
            <div>
              <p className="text-xs text-slate-500">密封投標中</p>
              <p className="text-sm font-medium">
                {viewer.kind === 'staff' ? `共 ${bids} 家投標` : mine ? `您已投標 ${mine.amount.toLocaleString('en-US')}` : '尚未投標'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-500">
                目前最高價 <span className="tabular-nums">· {bids} 次出價</span>
              </p>
              <Money value={price ?? auction.startPrice} size="lg" />
              {price === null && <span className="ml-1 text-xs text-slate-400">（起標價，尚無出價）</span>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {auction.status === '未開始' ? (
            <span className="text-slate-500">開標 {formatDateTime(auction.startAt)}</span>
          ) : auction.status === '進行中' ? (
            <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
          ) : auction.status === '議價中' && auction.negotiation ? (
            <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
          ) : null}

          {viewer.kind === 'staff' && auction.status !== '已撤標' && (
            <ReserveHint reservePrice={auction.reservePrice} currentPrice={price} />
          )}

          {viewer.kind === 'dealer' && auction.status === '進行中' && mine && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-medium',
                leading ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
              )}
            >
              {leading ? '您目前領先' : '您已被超越'}
            </span>
          )}

          {viewer.kind === 'dealer' && auction.status === '已成交' && auction.deal?.dealerId === dealerId && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800">您得標</span>
          )}
        </div>

        {footer && <div className="mt-auto flex gap-2 pt-2">{footer}</div>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: 實作 `src/pages/admin/AuctionList.tsx`**

```tsx
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { TYPE_LABEL } from '@/components/auction/TypeBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { filterAuctions } from '@/store/selectors'
import type { AuctionStatus, AuctionType } from '@/types'

const STATUSES: AuctionStatus[] = ['未開始', '進行中', '議價中', '已流標', '已成交', '已撤標']
const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']

type Query = { types?: string[]; statuses?: string[] }

const FIELDS: FilterField[] = [
  { kind: 'multi', key: 'types', label: '拍賣方式', options: TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })) },
  { kind: 'multi', key: 'statuses', label: '狀態', options: STATUSES.map((s) => ({ value: s, label: s })) },
]

const STATUS_ORDER: Record<AuctionStatus, number> = {
  進行中: 0,
  議價中: 1,
  未開始: 2,
  已成交: 3,
  已流標: 4,
  已撤標: 5,
}

export default function AdminAuctionList() {
  const { auctions, vehicles } = useStore()
  const [query, patch, clear] = useFilterParams<Query>({ types: 'array', statuses: 'array' })

  const results = useMemo(() => {
    const filtered = filterAuctions(auctions, vehicles, {
      types: query.types as AuctionType[] | undefined,
      statuses: query.statuses as AuctionStatus[] | undefined,
    })
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.endAt - b.endAt,
    )
  }, [auctions, vehicles, query])

  return (
    <>
      <PageHeader
        title="拍賣管理"
        description="進行中與議價中的拍賣排在最前面。點卡片進入監控頁。"
        actions={
          <Button asChild>
            <Link to="/admin/auctions/new">
              <Plus className="mr-1 size-4" /> 新增拍賣
            </Link>
          </Button>
        }
      />

      <FilterBar fields={FIELDS} value={query} onPatch={patch} onClear={clear} resultCount={results.length} />

      {results.length === 0 ? (
        <EmptyState
          title="沒有符合條件的拍賣"
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
            return (
              <AuctionCard
                key={a.id}
                auction={a}
                vehicle={vehicle}
                viewer={{ kind: 'staff' }}
                to={`/admin/auctions/${a.id}`}
                footer={
                  <>
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/admin/auctions/${a.id}`}>監控</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild={a.status === '未開始'}
                      disabled={a.status !== '未開始'}
                      className="flex-1"
                    >
                      {a.status === '未開始' ? <Link to={`/admin/auctions/${a.id}/edit`}>編輯</Link> : <span>編輯</span>}
                    </Button>
                  </>
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`，在 `/admin/auctions` 確認：

1. 14 筆拍賣，進行中與議價中排在最前
2. 卡片顯示目前最高價、出價次數、倒數、**底價提示（鎖頭 + 尚差 ¥X 或已達底價）**
3. 「即將結標」那筆倒數轉紅並脈動
4. 「已延長」那筆倒數旁有「已延長 9 分」
5. 密封投標的卡片顯示「共 N 家投標」而非金額
6. 已成交顯示結標金額、已流標顯示流標原因標籤
7. 篩「密封投標」+「進行中」只留 1 筆
8. 「編輯」只在未開始的卡片可點

- [ ] **Step 4: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/auction/AuctionCard.tsx src/pages/admin/AuctionList.tsx
git commit -m "feat: 拍賣卡片與公司端拍賣列表"
```

---

## Task 18: 拍賣上架編輯頁

**Files:**
- Modify: `src/pages/admin/AuctionEdit.tsx`

**Interfaces:**
- Consumes: `useStore().saveAuction`、`TYPE_LABEL`、`TYPE_HINT`、`toDateTimeLocal`、`fromDateTimeLocal`、`bidStepFor`
- Produces: 無新增匯出

**關鍵行為：只有「未開始」可編輯。** 其他狀態進入時整頁唯讀並顯示提示條。

- [ ] **Step 1: 實作 `src/pages/admin/AuctionEdit.tsx`**

```tsx
import { AlertTriangle, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { TYPE_HINT, TYPE_LABEL } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { useClock } from '@/clock/clockStore'
import { newId } from '@/lib/id'
import { bidStepFor, formatJPY } from '@/lib/money'
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/time'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/index'
import type { Auction, AuctionType, StepMode } from '@/types'

const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']
const HOUR = 3_600_000
const DAY = 86_400_000

const STEP_TABLE = [
  ['未滿 ¥500,000', '¥5,000'],
  ['¥500,000 – 未滿 ¥2,000,000', '¥10,000'],
  ['¥2,000,000 以上', '¥50,000'],
]

export default function AuctionEdit() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { auctions, vehicles } = useStore()
  const saveAuction = useStore((s) => s.saveAuction)

  const existing = id ? auctions.find((a) => a.id === id) : undefined
  const readOnly = existing !== undefined && existing.status !== '未開始'

  const now = useClock.getState().virtualNow()

  const [form, setForm] = useState<Auction>(() => {
    if (existing) return existing
    const preselected = search.get('vehicleId') ?? ''
    return {
      id: newId('a'),
      vehicleId: preselected,
      type: 'SCHEDULED',
      status: '未開始',
      startAt: now + HOUR,
      endAt: now + HOUR + 4 * DAY,
      originalEndAt: now + HOUR + 4 * DAY,
      startPrice: 500_000,
      reservePrice: 900_000,
      stepMode: 'auto',
      extendedMs: 0,
      emittedKeys: [],
      createdAt: now,
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  /** 可選車輛：在庫的，加上本筆拍賣已綁定的那台（狀態為已排拍） */
  const selectable = useMemo(
    () => vehicles.filter((v) => v.status === '在庫' || v.id === form.vehicleId),
    [vehicles, form.vehicleId],
  )
  const selected = vehicles.find((v) => v.id === form.vehicleId)

  const set = <K extends keyof Auction>(key: K, value: Auction[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function changeType(type: AuctionType) {
    setForm((f) => {
      const endAt = type === 'LIVE' ? f.startAt + 90_000 : f.startAt + 4 * DAY
      return {
        ...f,
        type,
        endAt,
        originalEndAt: endAt,
        buyNowPrice: type === 'SEALED' ? f.buyNowPrice : undefined,
      }
    })
  }

  function submit() {
    const next: Record<string, string> = {}
    if (!form.vehicleId) next.vehicleId = '請選擇車輛'
    if (form.endAt <= form.startAt) next.endAt = '結標時間必須晚於開始時間'
    if (form.startPrice <= 0) next.startPrice = '起標價必須大於 0'
    if (form.reservePrice < form.startPrice) next.reservePrice = '底價不得低於起標價'
    if (form.stepMode === 'fixed' && (!form.fixedStep || form.fixedStep <= 0)) {
      next.fixedStep = '請填寫固定喊價單位'
    }
    if (form.buyNowPrice !== undefined && form.buyNowPrice <= form.reservePrice) {
      next.buyNowPrice = '立即成交價必須高於底價'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const result = saveAuction({ ...form, originalEndAt: form.endAt })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(existing ? '拍賣已更新' : '拍賣已建立')
    navigate('/admin/auctions')
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={existing ? '編輯拍賣' : '新增拍賣'}
        description="底價與立即成交價都不會顯示給車商。"
        backTo="/admin/auctions"
      />

      {readOnly && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">此拍賣已{existing!.status}，無法編輯</p>
            <p className="mt-0.5 text-amber-800">
              只有狀態為「未開始」的拍賣可以修改設定。
              <Link to={`/admin/auctions/${existing!.id}`} className="ml-1 underline">
                前往監控頁
              </Link>
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={readOnly} className={cn('space-y-4', readOnly && 'opacity-60')}>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">選擇車輛</h2>
          {selectable.length === 0 ? (
            <p className="text-sm text-slate-500">目前沒有狀態為「在庫」的車輛可以排拍。</p>
          ) : (
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {selectable.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => set('vehicleId', v.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-2 text-left transition',
                    form.vehicleId === v.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-400',
                  )}
                >
                  <VehiclePhoto seed={v.photoSeeds[0]} alt={v.model} className="size-14 shrink-0 rounded" />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">
                      {v.brand} {v.model} <span className="tabular-nums text-slate-500">{v.year}</span>
                    </p>
                    <p className="font-mono text-xs text-slate-400">{v.orderNo}</p>
                    {v.status === '已排拍' && <p className="text-xs text-sky-700">目前綁定於本拍賣</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {errors.vehicleId && <p className="mt-2 text-xs text-rose-600">{errors.vehicleId}</p>}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">拍賣方式</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  form.type === t ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400',
                )}
              >
                <p className="text-sm font-medium">{TYPE_LABEL[t]}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{TYPE_HINT[t]}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">時間</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">開始時間</Label>
              <Input
                type="datetime-local"
                value={toDateTimeLocal(form.startAt)}
                onChange={(e) => {
                  const startAt = fromDateTimeLocal(e.target.value)
                  const span = form.endAt - form.startAt
                  setForm((f) => ({ ...f, startAt, endAt: startAt + span, originalEndAt: startAt + span }))
                }}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">結標時間</Label>
              <Input
                type="datetime-local"
                value={toDateTimeLocal(form.endAt)}
                onChange={(e) => set('endAt', fromDateTimeLocal(e.target.value))}
              />
              {errors.endAt && <p className="mt-1 text-xs text-rose-600">{errors.endAt}</p>}
              {form.type === 'LIVE' && (
                <p className="mt-1 text-xs text-slate-500">
                  即時同步拍建議 60–120 秒。目前設定為 {Math.round((form.endAt - form.startAt) / 1000)} 秒。
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">價格</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">起標價</Label>
              <Input
                type="number"
                step={1000}
                value={form.startPrice}
                onChange={(e) => set('startPrice', Number(e.target.value))}
              />
              {errors.startPrice && <p className="mt-1 text-xs text-rose-600">{errors.startPrice}</p>}
            </div>
            <div>
              <Label className="mb-1.5 flex items-center gap-1 text-sm">
                底價 <Lock className="size-3 text-slate-400" />
                <span className="text-xs font-normal text-slate-500">車商看不到</span>
              </Label>
              <Input
                type="number"
                step={10_000}
                value={form.reservePrice}
                onChange={(e) => set('reservePrice', Number(e.target.value))}
              />
              {errors.reservePrice && <p className="mt-1 text-xs text-rose-600">{errors.reservePrice}</p>}
              {selected && (
                <p className="mt-1 text-xs text-slate-500">
                  參考：貸款餘額 {formatJPY(selected.loanBalance)}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">每次喊價最小單位</h2>
          <div className="flex flex-wrap gap-2">
            {(['auto', 'fixed'] as StepMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => set('stepMode', mode)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm transition',
                  form.stepMode === mode
                    ? 'border-slate-900 bg-slate-50 font-medium'
                    : 'border-slate-200 hover:border-slate-400',
                )}
              >
                {mode === 'auto' ? '依價格自動分級' : '固定金額'}
              </button>
            ))}
          </div>

          {form.stepMode === 'auto' ? (
            <table className="mt-3 text-sm">
              <tbody className="divide-y divide-slate-100">
                {STEP_TABLE.map(([range, step]) => (
                  <tr key={range}>
                    <td className="py-1.5 pr-6 text-slate-500">{range}</td>
                    <td className="py-1.5 font-medium tabular-nums">{step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3 max-w-48">
              <Input
                type="number"
                step={1000}
                value={form.fixedStep ?? ''}
                placeholder="20000"
                onChange={(e) => set('fixedStep', Number(e.target.value) || undefined)}
              />
              {errors.fixedStep && <p className="mt-1 text-xs text-rose-600">{errors.fixedStep}</p>}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            以目前起標價 {formatJPY(form.startPrice)} 計算，第一次加價單位為{' '}
            <span className="font-medium tabular-nums">
              {formatJPY(bidStepFor(form.startPrice, form.stepMode, form.fixedStep))}
            </span>
            。
          </p>
        </Card>

        {form.type === 'SEALED' && (
          <Card className="p-4">
            <h2 className="mb-1 flex items-center gap-1 text-sm font-semibold">
              立即成交價 <Lock className="size-3 text-slate-400" />
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              僅密封投標可設定。有車商投到這個金額時立刻結標成交，不等結標時間。留空表示不設定。
            </p>
            <div className="max-w-48">
              <Input
                type="number"
                step={10_000}
                value={form.buyNowPrice ?? ''}
                placeholder="留空表示不設定"
                onChange={(e) => set('buyNowPrice', Number(e.target.value) || undefined)}
              />
              {errors.buyNowPrice && <p className="mt-1 text-xs text-rose-600">{errors.buyNowPrice}</p>}
            </div>
          </Card>
        )}
      </fieldset>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/admin/auctions')}>
          {readOnly ? '返回' : '取消'}
        </Button>
        {!readOnly && <Button onClick={submit}>{existing ? '儲存變更' : '建立拍賣'}</Button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 手動驗證**

Run: `npm run dev`

1. 從車庫列表點某台在庫車的「排拍」→ `/admin/auctions/new?vehicleId=...`，該車已預選
2. 車輛清單只有「在庫」的車；編輯既有未開始拍賣時，已綁定的那台（已排拍）也在清單裡且標註「目前綁定於本拍賣」
3. 切到「即時同步拍」→ 結標時間自動變成開始 +90 秒，並顯示秒數提示
4. 切到「密封投標」→ 出現「立即成交價」區塊；切回其他方式時該值被清掉
5. 改開始時間 → 結標時間平移，維持原本的時間長度
6. 底價填得比起標價低 → 顯示欄位錯誤，不儲存
7. 喊價單位選「固定金額」→ 出現輸入框，底部提示同步更新
8. **開 `/admin/auctions/a-run-normal/edit`（進行中）→ 整頁 disabled，頂部黃色提示條，只有「返回」按鈕**
9. 建立成功後回列表，新拍賣狀態為「未開始」，對應車輛變成「已排拍」

- [ ] **Step 3: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AuctionEdit.tsx
git commit -m "feat: 拍賣上架編輯頁（三種方式、喊價單位、未開始才可編輯）"
```

---

## Task 19: 拍賣監控頁（出價紀錄、議價處理、撤標）

**Files:**
- Create: `src/components/auction/BidHistory.tsx`, `src/components/auction/StatRow.tsx`
- Modify: `src/pages/admin/AuctionMonitor.tsx`

**Interfaces:**
- Consumes: `anonCodesFor`、`currentPrice`、`dealerCountOf`、`useStore().withdraw / acceptHighest / adjustReservePrice / declineNegotiationAs`、`dealerLabel`
- Produces:
  - `<BidHistory auctionId revealIdentity={boolean} highlightDealerId? />`
  - `<StatRow items={Array<{ label: string; value: React.ReactNode; hint?: string }>} />`

- [ ] **Step 1: 建立出價紀錄 `src/components/auction/BidHistory.tsx`**

```tsx
import { Bot } from 'lucide-react'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/cn'
import { dealerLabel } from '@/data/users'
import { useStore } from '@/store/index'
import { anonCodesFor, bidsOf } from '@/store/selectors'

/**
 * 出價紀錄時間軸。
 * revealIdentity 只在未來需要稽核視角時才開；預設全站都用匿名代號
 * （提案 8.1：隱藏出價者身分以抑制買方聯合）。
 * 永遠不顯示代理出價的上限金額。
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
        密封投標在結標前不揭露任何出價紀錄。目前共 {new Set(bids.map((b) => b.dealerId)).size} 家投標。
      </p>
    )
  }

  if (bids.length === 0) {
    return <p className="text-sm text-slate-500">尚無出價紀錄。</p>
  }

  const top = bids.reduce((best, b) => (b.amount > best.amount ? b : best))

  return (
    <ol className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
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
```

- [ ] **Step 2: 建立數據列 `src/components/auction/StatRow.tsx`**

```tsx
export function StatRow({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode; hint?: string }>
}) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{item.value}</dd>
          {item.hint && <p className="mt-0.5 text-xs text-slate-400">{item.hint}</p>}
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 3: 實作 `src/pages/admin/AuctionMonitor.tsx`**

```tsx
import { Ban, Handshake, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { BidHistory } from '@/components/auction/BidHistory'
import { Countdown } from '@/components/auction/Countdown'
import { StatRow } from '@/components/auction/StatRow'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { dealerLabel } from '@/data/users'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { currentPrice, dealerCountOf, bidCountOf } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function AuctionMonitor() {
  const { id = '' } = useParams()
  const user = useCurrentUser()
  const store = useStore()
  const auction = store.auctions.find((a) => a.id === id)
  const vehicle = auction ? store.vehicles.find((v) => v.id === auction.vehicleId) : undefined

  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [newReserve, setNewReserve] = useState(0)

  if (!auction || !vehicle) {
    return (
      <p className="text-sm text-slate-500">
        找不到這筆拍賣。<Link to="/admin/auctions" className="underline">返回列表</Link>
      </p>
    )
  }

  const price = currentPrice(store, auction.id)
  const now = () => useClock.getState().virtualNow()
  const sealedBeforeClose = auction.type === 'SEALED' && (auction.status === '進行中' || auction.status === '未開始')
  const canWithdraw = auction.status === '未開始' || auction.status === '進行中'

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
        description={vehicle.orderNo}
        backTo="/admin/auctions"
        actions={
          <>
            {auction.status === '未開始' && (
              <Button variant="outline" asChild>
                <Link to={`/admin/auctions/${auction.id}/edit`}>編輯設定</Link>
              </Button>
            )}
            {canWithdraw && (
              <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                <Ban className="mr-1 size-4" /> 撤標
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={auction.status} />
        <TypeBadge type={auction.type} />
        {auction.status === '進行中' && (
          <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
        )}
        {auction.status === '議價中' && auction.negotiation && (
          <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
        )}
      </div>

      <StatRow
        items={[
          {
            label: sealedBeforeClose ? '投標家數' : '目前最高價',
            value: sealedBeforeClose ? `${dealerCountOf(store, auction.id)} 家` : formatJPY(price ?? auction.startPrice),
            hint: price === null && !sealedBeforeClose ? '尚無出價（顯示起標價）' : undefined,
          },
          { label: '出價筆數', value: bidCountOf(store, auction.id) },
          { label: '參與車商數', value: dealerCountOf(store, auction.id) },
          {
            label: '底價',
            value: (
              <span className="flex items-center gap-1">
                <Lock className="size-3 text-slate-400" />
                {formatJPY(auction.reservePrice)}
              </span>
            ),
            hint:
              price !== null && price >= auction.reservePrice
                ? '已達底價'
                : `尚差 ${formatJPY(auction.reservePrice - (price ?? 0))}`,
          },
          {
            label: '已延長',
            value: auction.extendedMs > 0 ? `${Math.round(auction.extendedMs / 60_000)} 分鐘` : '—',
            hint: auction.extendedMs > 0 ? `原定 ${formatDateTime(auction.originalEndAt)}` : undefined,
          },
        ]}
      />

      {auction.status === '議價中' && auction.negotiation && (
        <Card className="mt-4 border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Handshake className="size-4" /> 議價處理
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            最高出價 <strong className="tabular-nums">{formatJPY(price ?? 0)}</strong> 未達底價{' '}
            <strong className="tabular-nums">{formatJPY(auction.reservePrice)}</strong>。已邀請{' '}
            <strong>{dealerLabel(auction.negotiation.dealerId)}</strong> 加價至{' '}
            <strong className="tabular-nums">{formatJPY(auction.negotiation.amount)}</strong> 成交。
          </p>
          {auction.negotiation.declinedDealerIds.length > 0 && (
            <p className="mt-1 text-xs text-amber-800">
              已放棄：{auction.negotiation.declinedDealerIds.map(dealerLabel).join('、')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                const r = store.acceptHighest({ auctionId: auction.id, now: now() })
                r.ok ? toast.success(`已接受最高價 ${formatJPY(price ?? 0)}，拍賣成交`) : toast.error(r.error)
              }}
            >
              接受目前最高價 {formatJPY(price ?? 0)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewReserve(auction.reservePrice)
                setReserveOpen(true)
              }}
            >
              調整底價
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const r = store.declineNegotiationAs({
                  auctionId: auction.id,
                  dealerId: auction.negotiation!.dealerId,
                  now: now(),
                })
                r.ok ? toast.success('已放棄本次議價') : toast.error(r.error)
              }}
            >
              放棄議價
            </Button>
          </div>
        </Card>
      )}

      {auction.status === '已撤標' && (
        <Card className="mt-4 border-slate-300 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold">撤標紀錄</h2>
          <p className="mt-2 text-sm">理由：{auction.withdrawReason}</p>
          <p className="mt-1 text-xs text-slate-500">
            操作人：{auction.withdrawnBy ? dealerLabel(auction.withdrawnBy) : '—'}
            　（車商端只會看到「已下架」，不會看到理由）
          </p>
        </Card>
      )}

      {auction.status === '已成交' && auction.deal && (
        <Card className="mt-4 border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">成交</h2>
          <p className="mt-2 text-sm text-blue-900">
            {dealerLabel(auction.deal.dealerId)} 以{' '}
            <strong className="tabular-nums">{formatJPY(auction.deal.amount)}</strong> 得標，
            成交時間 {formatDateTime(auction.deal.at)}。
          </p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="mb-2 text-sm font-semibold">出價紀錄</h2>
          <p className="mb-2 text-xs text-slate-500">
            出價者以匿名代號顯示。代理出價只標記來源，不顯示車商設定的上限金額。
          </p>
          <BidHistory auctionId={auction.id} hidden={sealedBeforeClose} />
        </div>

        <div>
          <VehiclePhoto
            seed={vehicle.photoSeeds[0]}
            alt={vehicle.model}
            className="mb-3 aspect-[4/3] rounded-lg"
          />
          <SpecTable vehicle={vehicle} showInternal={user?.canSeeReserve ?? false} />
        </div>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤標</DialogTitle>
            <DialogDescription>
              撤標後車輛轉為「已下架」，所有出價者與關注者都會收到通知。
              理由僅供內部留存，不會顯示給車商。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1.5 block text-sm">撤標理由（至少 5 個字）</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例如：借款人已清償欠款，車輛不再處分"
            />
            <p className="mt-1 text-xs text-slate-500">{reason.trim().length} / 5</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5}
              onClick={() => {
                const r = store.withdraw({ auctionId: auction.id, reason, byUserId: user!.id })
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                toast.success('已撤標，相關車商已收到通知')
                setWithdrawOpen(false)
                setReason('')
              }}
            >
              確認撤標
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整底價</DialogTitle>
            <DialogDescription>
              底價只能調降。若調降後最高出價已達新底價，拍賣會立刻以該最高出價成交
              （不是以新底價成交）。
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1.5 block text-sm">新底價</Label>
            <Input
              type="number"
              step={10_000}
              value={newReserve}
              onChange={(e) => setNewReserve(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              目前底價 {formatJPY(auction.reservePrice)}，最高出價 {formatJPY(price ?? 0)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const r = store.adjustReservePrice({
                  auctionId: auction.id,
                  reservePrice: newReserve,
                  now: now(),
                })
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                toast.success('底價已調整')
                setReserveOpen(false)
              }}
            >
              確認調整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`

1. `/admin/auctions/a-run-ending-soon` 顯示數據列五欄，底價欄有鎖頭與「尚差 ¥X」
2. 出價紀錄以匿名代號顯示，最高價那列有綠底，代理出價有「代理」標記，**沒有任何地方顯示代理上限**
3. 密封投標進行中的拍賣（`a-run-sealed`）出價紀錄顯示「結標前不揭露」與投標家數
4. `a-nego-a` 顯示琥珀色議價區塊，三個按鈕都可點
5. 「接受目前最高價」→ 狀態變已成交，成交金額等於最高出價
6. 「調整底價」調到最高價以下 → 立刻成交；調到最高價以上 → 維持議價且議價金額更新
7. 「撤標」理由少於 5 字時確認鈕 disabled；成功後顯示撤標紀錄區塊與「車商端只會看到已下架」的說明
8. 已延長的拍賣顯示延長分鐘數與原定結標時間

- [ ] **Step 5: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/auction/BidHistory.tsx src/components/auction/StatRow.tsx src/pages/admin/AuctionMonitor.tsx
git commit -m "feat: 拍賣監控頁（匿名出價紀錄、議價處理、撤標）"
```

---

## Task 20: 車商拍賣列表與關注清單

**Files:**
- Modify: `src/pages/dealer/AuctionList.tsx`, `src/pages/dealer/Watchlist.tsx`

**Interfaces:**
- Consumes: `AuctionCard`（`viewer={{ kind: 'dealer', dealerId }}`）、`filterAuctions`、`useStore().toggleWatch`
- Produces: 無新增匯出

- [ ] **Step 1: 實作 `src/pages/dealer/AuctionList.tsx`**

```tsx
import { Star } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { TYPE_LABEL } from '@/components/auction/TypeBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterBar, type FilterField } from '@/components/filters/FilterBar'
import { useFilterParams } from '@/components/filters/useFilterParams'
import { Button } from '@/components/ui/button'
import { ALL_BRANDS } from '@/data/vehicleCatalog'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/index'
import { filterAuctions, isWatched } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'
import type { AuctionStatus, AuctionType } from '@/types'

/** 車商看不到「已撤標」的原因，但仍需知道那台車已下架 */
const STATUSES: AuctionStatus[] = ['未開始', '進行中', '議價中', '已流標', '已成交', '已撤標']
const TYPES: AuctionType[] = ['SCHEDULED', 'LIVE', 'SEALED']

type Query = {
  brands?: string[]
  yearFrom?: number
  yearTo?: number
  orderNo?: string
  types?: string[]
  statuses?: string[]
  watched?: string
  mine?: string
}

const FIELDS: FilterField[] = [
  { kind: 'multi', key: 'brands', label: '廠牌', options: ALL_BRANDS.map((b) => ({ value: b, label: b })) },
  { kind: 'multi', key: 'types', label: '拍賣方式', options: TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })) },
  { kind: 'multi', key: 'statuses', label: '拍賣狀態', options: STATUSES.map((s) => ({ value: s, label: s })) },
  { kind: 'number', key: 'yearFrom', label: '年份起', placeholder: '2016' },
  { kind: 'number', key: 'yearTo', label: '年份迄', placeholder: '2023' },
  { kind: 'text', key: 'orderNo', label: '訂單號', placeholder: 'ORD-2026' },
  { kind: 'toggle', key: 'watched', label: '只看關注' },
  { kind: 'toggle', key: 'mine', label: '只看我出價過的' },
]

const STATUS_ORDER: Record<AuctionStatus, number> = {
  進行中: 0,
  議價中: 1,
  未開始: 2,
  已成交: 3,
  已流標: 4,
  已撤標: 5,
}

export default function DealerAuctionList() {
  const user = useCurrentUser()!
  const store = useStore()
  const [query, patch, clear] = useFilterParams<Query>({
    brands: 'array',
    types: 'array',
    statuses: 'array',
    yearFrom: 'number',
    yearTo: 'number',
    orderNo: 'string',
    watched: 'string',
    mine: 'string',
  })

  const results = useMemo(() => {
    let onlyIds: string[] | undefined
    if (query.watched === '1') {
      onlyIds = store.watches.filter((w) => w.dealerId === user.id).map((w) => w.auctionId)
    }
    if (query.mine === '1') {
      const bidIds = [...new Set(store.bids.filter((b) => b.dealerId === user.id).map((b) => b.auctionId))]
      onlyIds = onlyIds ? onlyIds.filter((x) => bidIds.includes(x)) : bidIds
    }

    const filtered = filterAuctions(store.auctions, store.vehicles, {
      brands: query.brands,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      orderNo: query.orderNo,
      types: query.types as AuctionType[] | undefined,
      statuses: query.statuses as AuctionStatus[] | undefined,
      onlyIds,
    })

    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.endAt - b.endAt,
    )
  }, [store.auctions, store.vehicles, store.watches, store.bids, query, user.id])

  return (
    <>
      <PageHeader
        title="拍賣列表"
        description="進行中的拍賣排在最前面。已成交會顯示結標金額，流標會標示流標原因。"
      />

      <FilterBar fields={FIELDS} value={query} onPatch={patch} onClear={clear} resultCount={results.length} />

      {results.length === 0 ? (
        <EmptyState
          title="沒有符合條件的拍賣"
          description="調整或清除篩選條件後再試一次。"
          action={
            <Button variant="outline" onClick={clear}>
              清除篩選
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = store.vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
            const watched = isWatched(store, a.id, user.id)
            return (
              <AuctionCard
                key={a.id}
                auction={a}
                vehicle={vehicle}
                viewer={{ kind: 'dealer', dealerId: user.id }}
                to={`/dealer/auctions/${a.id}`}
                footer={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      store.toggleWatch({ auctionId: a.id, dealerId: user.id })
                      toast.success(watched ? '已取消關注' : '已加入關注，有新動態會通知您')
                    }}
                  >
                    <Star className={cn('mr-1 size-3', watched && 'fill-amber-400 text-amber-500')} />
                    {watched ? '取消關注' : '關注'}
                  </Button>
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: 實作 `src/pages/dealer/Watchlist.tsx`**

```tsx
import { Star } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { AuctionCard } from '@/components/auction/AuctionCard'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function Watchlist() {
  const user = useCurrentUser()!
  const store = useStore()

  const results = useMemo(() => {
    const ids = store.watches.filter((w) => w.dealerId === user.id).map((w) => w.auctionId)
    return store.auctions.filter((a) => ids.includes(a.id)).sort((a, b) => a.endAt - b.endAt)
  }, [store.watches, store.auctions, user.id])

  return (
    <>
      <PageHeader
        title="關注清單"
        description="關注的拍賣有新出價、開標、延長或下架時，您都會收到通知。"
      />

      {results.length === 0 ? (
        <EmptyState
          title="還沒有關注任何拍賣"
          description="在拍賣列表或詳細頁點星號即可加入關注。"
          action={
            <Button asChild>
              <Link to="/dealer/auctions">前往拍賣列表</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((a) => {
            const vehicle = store.vehicles.find((v) => v.id === a.vehicleId)
            if (!vehicle) return null
            return (
              <AuctionCard
                key={a.id}
                auction={a}
                vehicle={vehicle}
                viewer={{ kind: 'dealer', dealerId: user.id }}
                to={`/dealer/auctions/${a.id}`}
                footer={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      store.toggleWatch({ auctionId: a.id, dealerId: user.id })
                      toast.success('已取消關注')
                    }}
                  >
                    <Star className="mr-1 size-3 fill-amber-400 text-amber-500" /> 取消關注
                  </Button>
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`，以山田商事登入：

1. `/dealer/auctions` 顯示全部拍賣，**卡片上完全沒有底價相關資訊**（沒有鎖頭、沒有「尚差 ¥X」）
2. 有出價的進行中拍賣顯示「您目前領先」或「您已被超越」
3. 已關注的卡片右上角有黃色星號
4. 密封投標卡片顯示「您已投標 ¥X」或「尚未投標」，**看不到別人的金額**
5. 已成交卡片顯示結標金額；自己得標的多一個「您得標」徽章
6. 已流標卡片有灰底流標標籤與原因
7. 已撤標卡片灰階、顯示「已下架」，**沒有理由**
8. 篩選六個維度都有效；「只看關注」與「只看我出價過的」可疊加
9. 側欄「關注清單」數字與實際筆數一致，取消關注後即時減少

- [ ] **Step 4: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/dealer/AuctionList.tsx src/pages/dealer/Watchlist.tsx
git commit -m "feat: 車商拍賣列表與關注清單"
```

---

## Task 21: 車商拍賣詳細頁（出價、自動出價、關注、議價）

**Files:**
- Create: `src/components/vehicle/PhotoCarousel.tsx`
- Create: `src/components/auction/BidPanel.tsx`, `src/components/auction/ProxyBidPanel.tsx`, `src/components/auction/NegotiationPanel.tsx`
- Modify: `src/pages/dealer/AuctionDetail.tsx`

**Interfaces:**
- Consumes: `useStore().submitBid / setProxyBid / cancelProxyBid / toggleWatch / acceptNegotiationAs / declineNegotiationAs`；`nextValidBid`, `validateBidAmount`, `bidStepFor`；`activeProxyOf`, `myHighestBid`, `isLeading`, `currentPrice`
- Produces:
  - `<PhotoCarousel seeds alt />`
  - `<BidPanel auction dealerId />`
  - `<ProxyBidPanel auction dealerId />`
  - `<NegotiationPanel auction dealerId />`

- [ ] **Step 1: 建立照片輪播 `src/components/vehicle/PhotoCarousel.tsx`**

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { VehiclePhoto } from '@/components/vehicle/VehiclePhoto'
import { cn } from '@/lib/cn'

export function PhotoCarousel({ seeds, alt }: { seeds: number[]; alt: string }) {
  const [index, setIndex] = useState(0)
  if (seeds.length === 0) return null

  const go = (delta: number) => setIndex((i) => (i + delta + seeds.length) % seeds.length)

  return (
    <div>
      <div className="relative">
        <VehiclePhoto seed={seeds[index]} alt={`${alt} 照片 ${index + 1}`} className="aspect-[4/3] rounded-lg" />
        {seeds.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="上一張"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="下一張"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-2 right-2 rounded bg-slate-900/70 px-2 py-0.5 text-xs tabular-nums text-white">
              {index + 1} / {seeds.length}
            </span>
          </>
        )}
      </div>

      {seeds.length > 1 && (
        <div className="mt-2 grid grid-cols-6 gap-2">
          {seeds.map((seed, i) => (
            <button key={`${seed}-${i}`} type="button" onClick={() => setIndex(i)} aria-label={`第 ${i + 1} 張`}>
              <VehiclePhoto
                seed={seed}
                alt=""
                size={{ w: 160, h: 120 }}
                className={cn(
                  'aspect-[4/3] rounded ring-2 transition',
                  i === index ? 'ring-slate-900' : 'ring-transparent hover:ring-slate-300',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 建立出價面板 `src/components/auction/BidPanel.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TYPE_HINT } from '@/components/auction/TypeBadge'
import { bidStepFor, formatJPY, nextValidBid, validateBidAmount } from '@/lib/money'
import { useStore } from '@/store/index'
import { currentPrice, myHighestBid } from '@/store/selectors'
import type { Auction } from '@/types'

/** 出價超過目前價這個倍數時，強制勾選確認（提案 5.3 異常金額提醒） */
const ABNORMAL_RATIO = 1.5

export function BidPanel({ auction, dealerId }: { auction: Auction; dealerId: string }) {
  const store = useStore()
  const submitBid = useStore((s) => s.submitBid)

  const sealed = auction.type === 'SEALED'
  const price = currentPrice(store, auction.id)
  const mine = myHighestBid(store, auction.id, dealerId)

  // 密封標看不到他人出價，門檻是起標價
  const basePrice = sealed ? null : price
  const min = nextValidBid(auction, basePrice)
  const step = bidStepFor(basePrice ?? auction.startPrice, auction.stepMode, auction.fixedStep)

  const [amount, setAmount] = useState<number>(min)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ackAbnormal, setAckAbnormal] = useState(false)

  const check = useMemo(() => validateBidAmount(auction, basePrice, amount), [auction, basePrice, amount])
  const abnormal = price !== null && amount > price * ABNORMAL_RATIO
  const alreadySealed = sealed && mine !== null

  if (alreadySealed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">您已投標</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatJPY(mine!.amount)}</p>
        <p className="mt-2 text-xs text-slate-500">
          密封投標每家車商僅能投標一次，投出後無法修改或撤回。開標後才會揭露所有投標金額。
        </p>
      </div>
    )
  }

  function open() {
    if (!check.ok) {
      toast.error(check.reason)
      return
    }
    setAckAbnormal(false)
    setConfirmOpen(true)
  }

  function confirm() {
    const r = submitBid({
      auctionId: auction.id,
      dealerId,
      amount,
      now: useClock.getState().virtualNow(),
    })
    if (!r.ok) {
      toast.error(r.error)
      return
    }
    toast.success(`已出價 ${formatJPY(amount)}`)
    setConfirmOpen(false)
    setAmount(nextValidBid(auction, currentPrice(useStore.getState(), auction.id)))
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{sealed ? '投標' : '出價'}</h2>

      {!sealed && (
        <Button
          className="mt-3 w-full"
          onClick={() => {
            setAmount(min)
            setAckAbnormal(false)
            setConfirmOpen(true)
          }}
        >
          + 一級距（{formatJPY(min)}）
        </Button>
      )}

      <div className="mt-3">
        <Label htmlFor="bid-amount" className="mb-1.5 block text-sm">
          {sealed ? '投標金額' : '自訂金額'}
        </Label>
        <Input
          id="bid-amount"
          type="number"
          step={step}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <p className={`mt-1 text-xs ${check.ok ? 'text-slate-500' : 'text-rose-600'}`}>
          {check.ok ? `至少 ${formatJPY(min)}，以 ${formatJPY(step)} 為級距` : check.reason}
        </p>
      </div>

      <Button variant={sealed ? 'default' : 'outline'} className="mt-3 w-full" onClick={open} disabled={!check.ok}>
        {sealed ? '送出密封投標' : '以此金額出價'}
      </Button>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">{TYPE_HINT[auction.type]}</p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認{sealed ? '投標' : '出價'}</DialogTitle>
            <DialogDescription>
              {sealed
                ? '密封投標送出後無法修改或撤回，請確認金額。'
                : '出價具約束力，送出後原則上不可撤回。'}
            </DialogDescription>
          </DialogHeader>

          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            <div className="flex justify-between px-4 py-2">
              <dt className="text-slate-500">您的{sealed ? '投標' : '出價'}金額</dt>
              <dd className="font-semibold tabular-nums">{formatJPY(amount)}</dd>
            </div>
            {!sealed && (
              <div className="flex justify-between px-4 py-2">
                <dt className="text-slate-500">目前最高價</dt>
                <dd className="tabular-nums">{price === null ? '尚無出價' : formatJPY(price)}</dd>
              </div>
            )}
            {!sealed && price !== null && (
              <div className="flex justify-between px-4 py-2">
                <dt className="text-slate-500">高出目前價</dt>
                <dd className="tabular-nums">{formatJPY(amount - price)}</dd>
              </div>
            )}
          </dl>

          {abnormal && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <Checkbox
                checked={ackAbnormal}
                onCheckedChange={(v) => setAckAbnormal(v === true)}
                className="mt-0.5"
              />
              <span className="text-amber-900">
                此金額超出目前最高價 {Math.round((amount / price! - 1) * 100)}%，明顯偏高。
                我確認金額無誤。
              </span>
            </label>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              返回修改
            </Button>
            <Button onClick={confirm} disabled={abnormal && !ackAbnormal}>
              確認送出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: 建立自動出價面板 `src/components/auction/ProxyBidPanel.tsx`**

```tsx
import { Bot } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bidStepFor, formatJPY, nextValidBid } from '@/lib/money'
import { useStore } from '@/store/index'
import { activeProxyOf, currentPrice } from '@/store/selectors'
import type { Auction } from '@/types'

export function ProxyBidPanel({ auction, dealerId }: { auction: Auction; dealerId: string }) {
  const store = useStore()
  const proxy = activeProxyOf(store, auction.id, dealerId)
  const price = currentPrice(store, auction.id)
  const min = nextValidBid(auction, price)
  const step = bidStepFor(price ?? auction.startPrice, auction.stepMode, auction.fixedStep)

  const [max, setMax] = useState<number>(min + step * 10)

  if (auction.type === 'SEALED') return null

  if (proxy) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
          <Bot className="size-4" /> 自動出價中
        </h2>
        <p className="mt-2 text-sm text-sky-900">
          已設定代理出價上限 <strong className="tabular-nums">{formatJPY(proxy.maxAmount)}</strong>
        </p>
        <p className="mt-1 text-xs text-sky-800">
          系統只會出「打敗目前最高價所需的最小金額」，不會直接跳到您的上限。
          達到上限被超越時會通知您。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            store.cancelProxyBid({ auctionId: auction.id, dealerId })
            toast.success('已取消自動出價')
          }}
        >
          取消自動出價
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Bot className="size-4" /> 自動出價
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        設定一個您願意出的最高金額。系統會在有人加價時，自動幫您出「打敗對手所需的最小金額」，
        一路加到您的上限為止，不必盯盤。上限金額只有您看得到。
      </p>
      <div className="mt-3">
        <Label htmlFor="proxy-max" className="mb-1.5 block text-sm">
          出價上限
        </Label>
        <Input
          id="proxy-max"
          type="number"
          step={step}
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-slate-500">至少 {formatJPY(min)}</p>
      </div>
      <Button
        className="mt-3 w-full"
        disabled={max < min}
        onClick={() => {
          const r = store.setProxyBid({
            auctionId: auction.id,
            dealerId,
            maxAmount: max,
            now: useClock.getState().virtualNow(),
          })
          r.ok ? toast.success(`已設定自動出價至 ${formatJPY(max)}`) : toast.error(r.error)
        }}
      >
        設定自動出價
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: 建立議價面板 `src/components/auction/NegotiationPanel.tsx`**

```tsx
import { Handshake } from 'lucide-react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Countdown } from '@/components/auction/Countdown'
import { Button } from '@/components/ui/button'
import { formatJPY } from '@/lib/money'
import { useStore } from '@/store/index'
import { myHighestBid } from '@/store/selectors'
import type { Auction } from '@/types'

export function NegotiationPanel({ auction, dealerId }: { auction: Auction; dealerId: string }) {
  const store = useStore()
  const nego = auction.negotiation
  if (!nego) return null

  const mine = myHighestBid(store, auction.id, dealerId)

  // 不是被邀請的人：只告知拍賣正在議價，不揭露對象與金額
  if (nego.dealerId !== dealerId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        這筆拍賣未達底價，目前正在與最高出價者議價中。
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Handshake className="size-4" /> 議價邀請
      </h2>
      <p className="mt-2 text-sm text-amber-900">
        您的出價 <strong className="tabular-nums">{formatJPY(mine?.amount ?? 0)}</strong> 未達底價。
        加價至 <strong className="tabular-nums">{formatJPY(nego.amount)}</strong> 即可成交。
      </p>
      <p className="mt-1 text-xs text-amber-800">
        <Countdown to={nego.deadline} prefix="剩餘決定時間" />
        　逾期未決定將依序詢問下一位出價者。
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          onClick={() => {
            const r = store.acceptNegotiationAs({
              auctionId: auction.id,
              dealerId,
              now: useClock.getState().virtualNow(),
            })
            r.ok ? toast.success(`已以 ${formatJPY(nego.amount)} 成交`) : toast.error(r.error)
          }}
        >
          加價至 {formatJPY(nego.amount)} 成交
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const r = store.declineNegotiationAs({
              auctionId: auction.id,
              dealerId,
              now: useClock.getState().virtualNow(),
            })
            r.ok ? toast.success('已放棄這次議價') : toast.error(r.error)
          }}
        >
          放棄
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 實作 `src/pages/dealer/AuctionDetail.tsx`**

```tsx
import { Star } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { BidHistory } from '@/components/auction/BidHistory'
import { BidPanel } from '@/components/auction/BidPanel'
import { Countdown } from '@/components/auction/Countdown'
import { Money } from '@/components/auction/Money'
import { NegotiationPanel } from '@/components/auction/NegotiationPanel'
import { ProxyBidPanel } from '@/components/auction/ProxyBidPanel'
import { StatusBadge } from '@/components/auction/StatusBadge'
import { TypeBadge } from '@/components/auction/TypeBadge'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { PhotoCarousel } from '@/components/vehicle/PhotoCarousel'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { cn } from '@/lib/cn'
import { formatJPY } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { bidCountOf, currentPrice, dealerCountOf, isLeading, isWatched, myHighestBid } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function AuctionDetail() {
  const { id = '' } = useParams()
  const user = useCurrentUser()!
  const store = useStore()
  const auction = store.auctions.find((a) => a.id === id)
  const vehicle = auction ? store.vehicles.find((v) => v.id === auction.vehicleId) : undefined

  if (!auction || !vehicle) {
    return (
      <p className="text-sm text-slate-500">
        找不到這筆拍賣。<Link to="/dealer/auctions" className="underline">返回列表</Link>
      </p>
    )
  }

  const price = currentPrice(store, auction.id)
  const mine = myHighestBid(store, auction.id, user.id)
  const leading = isLeading(store, auction.id, user.id)
  const watched = isWatched(store, auction.id, user.id)
  const sealed = auction.type === 'SEALED'
  const sealedBeforeClose = sealed && (auction.status === '進行中' || auction.status === '未開始')

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
        description={vehicle.orderNo}
        backTo="/dealer/auctions"
        actions={
          <Button
            variant="outline"
            onClick={() => {
              store.toggleWatch({ auctionId: auction.id, dealerId: user.id })
              toast.success(watched ? '已取消關注' : '已加入關注，有新動態會通知您')
            }}
          >
            <Star className={cn('mr-1 size-4', watched && 'fill-amber-400 text-amber-500')} />
            {watched ? '取消關注' : '關注'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <PhotoCarousel seeds={vehicle.photoSeeds} alt={`${vehicle.brand} ${vehicle.model}`} />

          <div>
            <h2 className="mb-2 text-sm font-semibold">車輛規格</h2>
            <SpecTable vehicle={vehicle} showInternal={false} />
          </div>

          {vehicle.remarks && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">車況備註</h2>
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                {vehicle.remarks}
              </p>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">出價紀錄</h2>
            <BidHistory auctionId={auction.id} hidden={sealedBeforeClose} highlightDealerId={user.id} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={auction.status} />
              <TypeBadge type={auction.type} />
            </div>

            <div className="mt-3">
              {auction.status === '未開始' ? (
                <>
                  <p className="text-xs text-slate-500">開標時間</p>
                  <p className="font-medium tabular-nums">{formatDateTime(auction.startAt)}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    起標價 {formatJPY(auction.startPrice)}。建議先加入關注，開標時會通知您。
                  </p>
                </>
              ) : auction.status === '已成交' && auction.deal ? (
                <>
                  <p className="text-xs text-slate-500">結標金額</p>
                  <Money value={auction.deal.amount} size="lg" className="text-blue-700" />
                  <p className="mt-1 text-sm">
                    {auction.deal.dealerId === user.id ? (
                      <span className="font-medium text-blue-700">您得標</span>
                    ) : (
                      <span className="text-slate-500">已由其他車商得標</span>
                    )}
                  </p>
                </>
              ) : auction.status === '已流標' ? (
                <>
                  <span className="inline-block rounded bg-rose-50 px-2 py-1 text-sm font-medium text-rose-700">
                    流標 · {auction.closeReason}
                  </span>
                  {price !== null && (
                    <p className="mt-2 text-xs text-slate-500">最高出價 {formatJPY(price)}</p>
                  )}
                </>
              ) : auction.status === '已撤標' ? (
                <p className="text-sm text-slate-500">此拍賣已下架，本次競價中止。</p>
              ) : sealedBeforeClose ? (
                <>
                  <p className="text-xs text-slate-500">密封投標中</p>
                  <p className="font-medium">共 {dealerCountOf(store, auction.id)} 家投標</p>
                  <p className="mt-1 text-xs text-slate-500">
                    起標價 {formatJPY(auction.startPrice)}。過程中不揭露任何投標金額。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    目前最高價 <span className="tabular-nums">· {bidCountOf(store, auction.id)} 次出價</span>
                  </p>
                  <Money value={price ?? auction.startPrice} size="lg" />
                  {price === null && (
                    <p className="text-xs text-slate-400">（起標價，尚無出價）</p>
                  )}
                  {mine && (
                    <p
                      className={cn(
                        'mt-2 inline-block rounded px-2 py-0.5 text-sm font-medium',
                        leading ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
                      )}
                    >
                      {leading ? '您目前領先' : `您已被超越（您的出價 ${formatJPY(mine.amount)}）`}
                    </p>
                  )}
                </>
              )}
            </div>

            {(auction.status === '進行中' || auction.status === '議價中') && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                {auction.status === '進行中' ? (
                  <Countdown to={auction.endAt} extendedMs={auction.extendedMs} prefix="剩餘" />
                ) : (
                  auction.negotiation && <Countdown to={auction.negotiation.deadline} prefix="議價剩餘" />
                )}
              </div>
            )}
          </div>

          {auction.status === '進行中' && (
            <>
              <BidPanel auction={auction} dealerId={user.id} />
              <ProxyBidPanel auction={auction} dealerId={user.id} />
            </>
          )}

          {auction.status === '議價中' && <NegotiationPanel auction={auction} dealerId={user.id} />}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 手動驗證（這是最重要的一輪驗證）**

Run: `npm run dev`，以山田商事登入：

**基本出價**
1. 進 `a-run-normal` → 右欄 sticky，照片輪播可左右切換與點縮圖
2. **規格表沒有貸款餘額那一列**（`showInternal={false}`）
3. 點「+ 一級距」→ 確認 Dialog 顯示金額、目前最高價、高出金額 → 確認後價格上升、出價紀錄多一列且標「（您）」
4. 自訂金額填一個非級距的數字 → 即時顯示「金額必須是 ¥X 的整數倍」，按鈕 disabled
5. 自訂金額填目前價的 2 倍 → Dialog 出現琥珀色警示與強制勾選，未勾選時確認鈕 disabled

**自動出價**
6. 設定自動出價上限 → 顯示藍色「自動出價中」區塊
7. 用頂欄切換到鈴鐺自動車，對同一筆出價 → 切回山田，出價紀錄可見系統以「代理」自動反超
8. 鈴鐺自動車出價超過山田的上限 → 山田收到 OUTBID 通知，且自動出價區塊變回可設定狀態

**密封投標**
9. 進 `a-run-sealed` → 沒有「+ 一級距」按鈕、出價紀錄顯示「結標前不揭露」、**沒有自動出價區塊**
10. 送出投標 → 變成「您已投標 ¥X」，無法再投第二次

**議價**
11. 進 `a-nego-a`，若當前帳號是被邀請對象 → 顯示琥珀色議價邀請與兩個按鈕；否則顯示「正在與最高出價者議價中」且不揭露金額
12. 點「加價至 ¥X 成交」→ 狀態變已成交，右欄顯示「您得標」

**關注**
13. 點頂部「關注」→ 星號變黃，側欄關注數 +1

- [ ] **Step 7: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 8: Commit**

```bash
git add src/components/vehicle/PhotoCarousel.tsx src/components/auction src/pages/dealer/AuctionDetail.tsx
git commit -m "feat: 車商拍賣詳細頁（出價二次確認、代理出價、議價回應、關注）"
```

---

## Task 22: 通知（鈴鐺、下拉面板、通知頁）

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`（取代 Task 13 的 stub）
- Create: `src/components/notifications/NotificationList.tsx`
- Modify: `src/pages/dealer/Notifications.tsx`

**Interfaces:**
- Consumes: `notificationsFor`, `unreadCount`, `useStore().markRead / markAllRead`
- Produces:
  - `<NotificationBell />`
  - `<NotificationList notifications onNavigate grouped? />`
  - `NOTIFICATION_ICON: Record<NotificationType, LucideIcon>`

- [ ] **Step 1: 建立通知清單 `src/components/notifications/NotificationList.tsx`**

```tsx
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
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/time'
import type { AppNotification, NotificationType } from '@/types'

export const NOTIFICATION_ICON: Record<NotificationType, typeof Bell> = {
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
const URGENT: Set<NotificationType> = new Set(['OUTBID', 'NEGOTIATION_INVITE', 'ENDING_SOON', 'WON'])

export function NotificationList({
  notifications,
  onSelect,
  grouped = false,
  emptyText = '目前沒有通知。',
}: {
  notifications: AppNotification[]
  onSelect: (n: AppNotification) => void
  grouped?: boolean
  emptyText?: string
}) {
  if (notifications.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyText}</p>
  }

  if (!grouped) {
    return <ul className="divide-y divide-slate-100">{notifications.map((n) => renderItem(n, onSelect))}</ul>
  }

  const now = Date.now()
  const groups: Array<[string, AppNotification[]]> = [
    ['今天', notifications.filter((n) => now - n.at < 86_400_000)],
    ['本週', notifications.filter((n) => now - n.at >= 86_400_000 && now - n.at < 7 * 86_400_000)],
    ['更早', notifications.filter((n) => now - n.at >= 7 * 86_400_000)],
  ]

  return (
    <div className="space-y-6">
      {groups
        .filter(([, list]) => list.length > 0)
        .map(([label, list]) => (
          <section key={label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {list.map((n) => renderItem(n, onSelect))}
            </ul>
          </section>
        ))}
    </div>
  )
}

function renderItem(n: AppNotification, onSelect: (n: AppNotification) => void) {
  const Icon = NOTIFICATION_ICON[n.type]
  return (
    <li key={n.id}>
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
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm leading-tight', !n.read && 'font-semibold')}>{n.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
          <p className="mt-1 text-xs tabular-nums text-slate-400">{formatDateTime(n.at)}</p>
        </div>
        {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" />}
      </button>
    </li>
  )
}
```

- [ ] **Step 2: 實作鈴鐺 `src/components/notifications/NotificationBell.tsx`**

```tsx
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useStore } from '@/store/index'
import { notificationsFor, unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

const PREVIEW_COUNT = 8

export function NotificationBell() {
  const user = useCurrentUser()
  const store = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const all = notificationsFor(store.notifications, user.id)
  const unread = unreadCount(store.notifications, user.id)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-white hover:bg-white/10 hover:text-white"
          aria-label={`通知${unread > 0 ? `，${unread} 則未讀` : ''}`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold tabular-nums text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <p className="text-sm font-semibold">通知</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => store.markAllRead(user.id)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              全部標為已讀
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            notifications={all.slice(0, PREVIEW_COUNT)}
            onSelect={(n) => {
              store.markRead(n.id)
              setOpen(false)
              navigate(
                user.role === 'staff' ? `/admin/auctions/${n.auctionId}` : `/dealer/auctions/${n.auctionId}`,
              )
            }}
          />
        </div>

        {user.role === 'dealer' && all.length > PREVIEW_COUNT && (
          <div className="border-t border-slate-100 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/dealer/notifications')
              }}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              查看全部 {all.length} 則
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

`Popover` 需要另外安裝：`npx shadcn@latest add popover`。

- [ ] **Step 3: 實作通知頁 `src/pages/dealer/Notifications.tsx`**

```tsx
import { useNavigate } from 'react-router'
import { NotificationList } from '@/components/notifications/NotificationList'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { notificationsFor, unreadCount } from '@/store/selectors'
import { useCurrentUser } from '@/store/useCurrentUser'

export default function Notifications() {
  const user = useCurrentUser()!
  const store = useStore()
  const navigate = useNavigate()

  const all = notificationsFor(store.notifications, user.id)
  const unread = unreadCount(store.notifications, user.id)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="通知"
        description={unread > 0 ? `${unread} 則未讀` : '全部已讀'}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => store.markAllRead(user.id)}>
              全部標為已讀
            </Button>
          )
        }
      />
      <NotificationList
        notifications={all}
        grouped
        emptyText="還沒有任何通知。關注拍賣或出價後，這裡會出現最新動態。"
        onSelect={(n) => {
          store.markRead(n.id)
          navigate(`/dealer/auctions/${n.auctionId}`)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 手動驗證**

Run: `npm run dev`

1. 以山田商事登入 → 鈴鐺有紅色未讀數
2. 點鈴鐺 → 下拉顯示最近 8 則，未讀有淺藍底與藍點，OUTBID／議價／即將結標／得標的 icon 是紅色
3. 點任一則 → 標為已讀、關閉下拉、跳到對應拍賣詳細頁
4. 「全部標為已讀」→ 紅色數字消失
5. 「查看全部 N 則」→ 到 `/dealer/notifications`，依今天／本週／更早分組
6. 切換到公司人員 → 鈴鐺內容換成內部通知（無人出價、即將結標未達底價、拍賣已成交），點擊跳到 `/admin/auctions/:id`
7. 用另一個帳號出價超越山田 → 切回山田，鈴鐺數字增加且 toast 曾跳出

- [ ] **Step 5: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/notifications src/pages/dealer/Notifications.tsx
git commit -m "feat: 通知鈴鐺、下拉面板與通知頁"
```

---

## Task 23: Demo 控制台

**Files:**
- Modify: `src/components/demo/DemoConsole.tsx`（取代 Task 13 的 stub）
- Create: `src/components/demo/useConsoleState.ts`, `TimeControls.tsx`, `BidSimulator.tsx`, `ForceStateControls.tsx`, `NotificationPusher.tsx`, `ScenarioPicker.tsx`

**Interfaces:**
- Consumes: `useClock`、`useStore`、`USERS`、`ALL_DEALER_IDS`、`dealerLabel`
- Produces:
  - `useConsoleState()`：`{ mode, setMode, corner, setCorner }`，`mode: 'hidden' | 'mini' | 'full'`，`corner: 'br' | 'bl' | 'tr' | 'tl'`，兩者都存 localStorage
  - 五個區塊元件，各自獨立
  - `<DemoConsole />`

**必須遵守的約束**（規格 9.1）

- 全程 `position: fixed` overlay，**不得使用 push 式 drawer**
- 可切換四個角落，位置存 localStorage
- 快捷鍵 `` ` `` 切換 hidden ↔ full，`Esc` 收起
- 點面板外**不**自動關閉
- 面板最高 `80vh` 且自身可滾動
- 每次操作跳 toast 回饋

- [ ] **Step 1: 建立收合狀態 `src/components/demo/useConsoleState.ts`**

```ts
import { useEffect, useState } from 'react'

export type ConsoleMode = 'hidden' | 'mini' | 'full'
export type Corner = 'br' | 'bl' | 'tr' | 'tl'

const MODE_KEY = 'auction-demo:console-mode'
const CORNER_KEY = 'auction-demo:console-corner'

export const CORNER_CLASS: Record<Corner, string> = {
  br: 'bottom-4 right-4',
  bl: 'bottom-4 left-4',
  tr: 'top-20 right-4',
  tl: 'top-20 left-4',
}

export const CORNER_LABEL: Record<Corner, string> = {
  br: '右下',
  bl: '左下',
  tr: '右上',
  tl: '左上',
}

export function useConsoleState() {
  const [mode, setMode] = useState<ConsoleMode>(
    () => (localStorage.getItem(MODE_KEY) as ConsoleMode | null) ?? 'mini',
  )
  const [corner, setCorner] = useState<Corner>(
    () => (localStorage.getItem(CORNER_KEY) as Corner | null) ?? 'br',
  )

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem(CORNER_KEY, corner)
  }, [corner])

  // 快捷鍵：` 切換 hidden ↔ full，Esc 收起
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing) return

      if (e.key === '`') {
        e.preventDefault()
        setMode((m) => (m === 'full' ? 'hidden' : 'full'))
      } else if (e.key === 'Escape') {
        setMode((m) => (m === 'full' ? 'mini' : m))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return { mode, setMode, corner, setCorner }
}
```

- [ ] **Step 2: 時間控制 `src/components/demo/TimeControls.tsx`**

```tsx
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { SPEEDS, useClock } from '@/clock/clockStore'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'

const MIN = 60_000
const SKIPS: Array<[string, number]> = [
  ['+1 分', MIN],
  ['+10 分', 10 * MIN],
  ['+1 小時', 60 * MIN],
  ['+1 天', 1_440 * MIN],
]

const SPEED_LABEL: Record<number, string> = { 0: '暫停', 1: '1x', 10: '10x', 60: '60x' }

export function TimeControls() {
  const clock = useClock()
  const now = useVirtualNow(1000)

  function skip(ms: number, label: string) {
    const before = useStore.getState().notifications.length
    clock.skip(ms)
    // 立刻推進引擎，讓使用者馬上看到結果而不必等下一個 tick
    useStore.getState().advance(useClock.getState().virtualNow())
    const fired = useStore.getState().notifications.length - before
    toast.success(`已快轉 ${label.replace('+', '')}`, {
      description: fired > 0 ? `觸發 ${fired} 則通知` : '沒有事件被觸發',
    })
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">時間</h3>
      <p className="mb-2 font-mono text-sm tabular-nums">{formatDateTime(now)}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {SKIPS.map(([label, ms]) => (
          <Button key={label} variant="outline" size="sm" onClick={() => skip(ms, label)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => clock.setSpeed(s)}
            className={cn(
              'flex-1 rounded border px-2 py-1 text-xs transition',
              clock.speed === s
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white hover:border-slate-400',
            )}
          >
            {SPEED_LABEL[s]}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-1.5 w-full justify-start text-xs text-slate-500"
        onClick={() => {
          clock.resetToReal()
          toast.success('已回到真實時間')
        }}
      >
        <RotateCcw className="mr-1 size-3" /> 回到真實時間
      </Button>
    </section>
  )
}
```

- [ ] **Step 3: 出價模擬器 `src/components/demo/BidSimulator.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ALL_DEALER_IDS, dealerLabel } from '@/data/users'
import { formatJPY, nextValidBid } from '@/lib/money'
import { useStore } from '@/store/index'
import { currentPrice } from '@/store/selectors'

const AUTO_INTERVAL_MS = 3_000

export function BidSimulator() {
  const store = useStore()
  const { id: routeAuctionId } = useParams()

  const biddable = store.auctions.filter((a) => a.status === '進行中')
  const [auctionId, setAuctionId] = useState('')
  const [dealerId, setDealerId] = useState(ALL_DEALER_IDS[0])
  const [amount, setAmount] = useState<number | ''>('')
  const [auto, setAuto] = useState(false)
  const timer = useRef<number | null>(null)

  // 預設選當前頁面那筆拍賣
  const effectiveId =
    auctionId || (routeAuctionId && biddable.some((a) => a.id === routeAuctionId) ? routeAuctionId : biddable[0]?.id) || ''

  const auction = store.auctions.find((a) => a.id === effectiveId)
  const price = auction ? currentPrice(store, auction.id) : null
  const min = auction ? nextValidBid(auction, auction.type === 'SEALED' ? null : price) : 0

  function bidOnce(dealer: string, value: number) {
    if (!auction) return
    const r = store.submitBid({
      auctionId: auction.id,
      dealerId: dealer,
      amount: value,
      now: useClock.getState().virtualNow(),
    })
    if (!r.ok) toast.error(`${dealerLabel(dealer)}：${r.error}`)
  }

  // 連續隨機出價
  useEffect(() => {
    if (!auto) {
      if (timer.current) window.clearInterval(timer.current)
      timer.current = null
      return
    }
    timer.current = window.setInterval(() => {
      const s = useStore.getState()
      const a = s.auctions.find((x) => x.id === effectiveId)
      if (!a || a.status !== '進行中') {
        setAuto(false)
        return
      }
      const leader = currentPrice(s, a.id) === null ? null : s.bids.filter((b) => b.auctionId === a.id).at(-1)?.dealerId
      const pool = ALL_DEALER_IDS.filter((d) => d !== leader)
      const dealer = pool[Math.floor(Math.random() * pool.length)]
      bidOnce(dealer, nextValidBid(a, a.type === 'SEALED' ? null : currentPrice(s, a.id)))
    }, AUTO_INTERVAL_MS)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [auto, effectiveId])

  if (biddable.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">模擬出價</h3>
        <p className="text-xs text-slate-500">目前沒有進行中的拍賣。</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">模擬出價</h3>

      <select
        value={effectiveId}
        onChange={(e) => setAuctionId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {biddable.map((a) => {
          const v = store.vehicles.find((x) => x.id === a.vehicleId)
          return (
            <option key={a.id} value={a.id}>
              {v ? `${v.brand} ${v.model} ${v.year}` : a.id}
              {a.id === routeAuctionId ? '（當前頁面）' : ''}
            </option>
          )
        })}
      </select>

      <select
        value={dealerId}
        onChange={(e) => setDealerId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {ALL_DEALER_IDS.map((d) => (
          <option key={d} value={d}>
            {dealerLabel(d)}
          </option>
        ))}
      </select>

      <p className="mb-1.5 text-xs text-slate-500">
        {auction?.type === 'SEALED'
          ? `密封投標 · 起標價 ${formatJPY(auction.startPrice)}`
          : `目前 ${price === null ? '尚無出價' : formatJPY(price)} · 下一級距 ${formatJPY(min)}`}
      </p>

      <div className="flex gap-1.5">
        <Button size="sm" className="flex-1" onClick={() => bidOnce(dealerId, min)}>
          加一級距
        </Button>
        <Input
          type="number"
          placeholder="自訂"
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 w-24 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={amount === ''}
          onClick={() => amount !== '' && bidOnce(dealerId, amount)}
        >
          送出
        </Button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        連續隨機出價（每 3 秒一次）
      </label>
    </section>
  )
}
```

- [ ] **Step 4: 強制狀態 `src/components/demo/ForceStateControls.tsx`**

```tsx
import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

const ACTIONS: Array<{ label: string; to: 'start' | 'close' | 'pass' | 'negotiate' }> = [
  { label: '立即開標', to: 'start' },
  { label: '立即結標', to: 'close' },
  { label: '強制流標', to: 'pass' },
  { label: '強制議價', to: 'negotiate' },
]

export function ForceStateControls() {
  const store = useStore()
  const user = useCurrentUser()
  const { id: routeAuctionId } = useParams()

  const targets = store.auctions.filter(
    (a) => a.status === '未開始' || a.status === '進行中' || a.status === '議價中',
  )
  const [auctionId, setAuctionId] = useState('')
  const effectiveId =
    auctionId || (routeAuctionId && targets.some((a) => a.id === routeAuctionId) ? routeAuctionId : targets[0]?.id) || ''

  function run(to: 'start' | 'close' | 'pass' | 'negotiate', label: string) {
    const r = store.forceStatus({ auctionId: effectiveId, to, now: useClock.getState().virtualNow() })
    r.ok ? toast.success(`${label}完成`) : toast.error(r.error)
  }

  if (targets.length === 0) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">強制狀態</h3>
        <p className="text-xs text-slate-500">沒有可操作的拍賣。</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">強制狀態</h3>

      <select
        value={effectiveId}
        onChange={(e) => setAuctionId(e.target.value)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {targets.map((a) => {
          const v = store.vehicles.find((x) => x.id === a.vehicleId)
          return (
            <option key={a.id} value={a.id}>
              [{a.status}] {v ? `${v.brand} ${v.model}` : a.id}
            </option>
          )
        })}
      </select>

      <div className="grid grid-cols-2 gap-1.5">
        {ACTIONS.map(({ label, to }) => (
          <Button key={to} variant="outline" size="sm" onClick={() => run(to, label)}>
            {label}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-1.5 w-full text-rose-700 hover:bg-rose-50"
        onClick={() => {
          const r = store.withdraw({
            auctionId: effectiveId,
            reason: 'Demo 控制台觸發',
            byUserId: user?.id ?? 'u-staff',
          })
          r.ok ? toast.success('已撤標') : toast.error(r.error)
        }}
      >
        強制撤標
      </Button>
    </section>
  )
}
```

- [ ] **Step 5: 通知推送 `src/components/demo/NotificationPusher.tsx`**

```tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import { USERS, dealerLabel } from '@/data/users'
import { useStore } from '@/store/index'
import type { NotificationType } from '@/types'

const TYPES: Array<{ value: NotificationType; label: string; title: string; body: string }> = [
  { value: 'OUTBID', label: '出價被超越', title: '您的出價已被超越', body: '這筆拍賣已有更高出價，請確認是否加價。' },
  { value: 'ENDING_SOON', label: '即將結標', title: '拍賣即將結標', body: '這筆拍賣即將結標，請確認您的出價。' },
  { value: 'EXTENDED', label: '結標已延長', title: '結標時間已延長', body: '因結標前有新出價，結標時間延長 3 分鐘。' },
  { value: 'WON', label: '得標', title: '恭喜得標', body: '您已成功得標這筆拍賣。' },
  { value: 'LOST', label: '未得標', title: '未得標', body: '這筆拍賣已由其他車商得標。' },
  { value: 'NEGOTIATION_INVITE', label: '議價邀請', title: '議價邀請', body: '您的出價未達底價，加價後即可成交，請於 24 小時內決定。' },
  { value: 'WATCHED_NEW_BID', label: '關注的有新出價', title: '關注的拍賣有新出價', body: '您關注的拍賣出現新出價。' },
  { value: 'WATCHED_STARTED', label: '關注的已開標', title: '關注的拍賣已開標', body: '您關注的拍賣已開始競價。' },
  { value: 'WITHDRAWN', label: '拍賣已下架', title: '拍賣已下架', body: '這筆拍賣已下架，本次競價中止。' },
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
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">推送通知</h3>

      <select
        value={type}
        onChange={(e) => setType(e.target.value as NotificationType)}
        className="mb-1.5 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select
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

      <select
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
          const preset = TYPES.find((t) => t.value === type)!
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
```

- [ ] **Step 6: 組裝控制台 `src/components/demo/DemoConsole.tsx`**

```tsx
import { ChevronsDownUp, Move, Settings2, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { useVirtualNow } from '@/clock/useVirtualNow'
import { BidSimulator } from '@/components/demo/BidSimulator'
import { ForceStateControls } from '@/components/demo/ForceStateControls'
import { NotificationPusher } from '@/components/demo/NotificationPusher'
import { ScenarioPicker } from '@/components/demo/ScenarioPicker'
import { TimeControls } from '@/components/demo/TimeControls'
import { CORNER_CLASS, CORNER_LABEL, useConsoleState, type Corner } from '@/components/demo/useConsoleState'
import { Button } from '@/components/ui/button'
import { LOGINABLE_USERS } from '@/data/users'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/time'
import { useStore } from '@/store/index'
import { useCurrentUser } from '@/store/useCurrentUser'

const CORNERS: Corner[] = ['br', 'bl', 'tr', 'tl']

export function DemoConsole() {
  const user = useCurrentUser()
  const { mode, setMode, corner, setCorner } = useConsoleState()
  const clock = useClock()
  const now = useVirtualNow(1000)
  const login = useStore((s) => s.login)
  const navigate = useNavigate()

  // 未登入時不顯示（登入頁不需要控制台）
  if (!user) return null

  if (mode === 'hidden') {
    return (
      <button
        type="button"
        onClick={() => setMode('full')}
        title="開啟 Demo 控制台（快捷鍵 `）"
        className={cn(
          'fixed z-50 grid size-12 place-items-center rounded-full bg-slate-900/40 text-white shadow-lg transition hover:bg-slate-900',
          CORNER_CLASS[corner],
        )}
      >
        <Settings2 className="size-5" />
      </button>
    )
  }

  if (mode === 'mini') {
    return (
      <div
        className={cn(
          'fixed z-50 flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 shadow-lg backdrop-blur',
          CORNER_CLASS[corner],
        )}
      >
        <Settings2 className="size-4 text-slate-400" />
        <span className="font-mono text-xs tabular-nums">{formatDateTime(now)}</span>
        <button
          type="button"
          onClick={() => {
            clock.skip(600_000)
            useStore.getState().advance(useClock.getState().virtualNow())
            toast.success('已快轉 10 分鐘')
          }}
          className="rounded border border-slate-200 px-1.5 py-0.5 text-xs hover:border-slate-400"
        >
          +10m
        </button>
        <button
          type="button"
          onClick={() => clock.setSpeed(clock.speed === 1 ? 10 : 1)}
          className={cn(
            'rounded border px-1.5 py-0.5 text-xs',
            clock.speed > 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200',
          )}
        >
          {clock.speed > 1 ? `x${clock.speed}` : '⏩'}
        </button>
        <button type="button" onClick={() => setMode('full')} className="text-xs text-slate-500 hover:text-slate-900">
          展開
        </button>
        <button type="button" onClick={() => setMode('hidden')} aria-label="收起控制台">
          <X className="size-3.5 text-slate-400 hover:text-slate-900" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex max-h-[80vh] w-90 flex-col rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur',
        CORNER_CLASS[corner],
      )}
      style={{ width: '22.5rem' }}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <Settings2 className="size-4 text-slate-400" />
        <span className="text-sm font-semibold">Demo 控制台</span>
        <span className="ml-auto flex items-center gap-1">
          <span title="移動位置" className="flex items-center">
            <Move className="size-3 text-slate-300" />
          </span>
          {CORNERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCorner(c)}
              title={`移到${CORNER_LABEL[c]}`}
              className={cn(
                'size-4 rounded border text-[9px] leading-none',
                corner === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-400',
              )}
            >
              {CORNER_LABEL[c][0]}
            </button>
          ))}
          <button type="button" onClick={() => setMode('mini')} title="縮小" className="ml-1">
            <ChevronsDownUp className="size-3.5 text-slate-400 hover:text-slate-900" />
          </button>
          <button type="button" onClick={() => setMode('hidden')} title="收起（Esc）">
            <X className="size-3.5 text-slate-400 hover:text-slate-900" />
          </button>
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <TimeControls />
        <hr className="border-slate-100" />
        <BidSimulator />
        <hr className="border-slate-100" />
        <ForceStateControls />
        <hr className="border-slate-100" />
        <NotificationPusher />
        <hr className="border-slate-100" />

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">場景</h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {LOGINABLE_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={u.id === user.id}
                onClick={() => {
                  login(u.id)
                  navigate(u.role === 'staff' ? '/admin/garage' : '/dealer/auctions')
                  toast.success(`已切換為 ${u.company ?? u.name}`)
                }}
                className={cn(
                  'rounded border px-2 py-1 text-xs transition',
                  u.id === user.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 hover:border-slate-400',
                )}
              >
                {u.company ?? u.name}
              </button>
            ))}
          </div>
          <ScenarioPicker />
        </section>
      </div>

      <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
        快捷鍵：<kbd className="font-mono">`</kbd> 開合 · <kbd className="font-mono">Esc</kbd> 收起
      </p>
    </div>
  )
}
```

`ScenarioPicker` 在 Task 24 實作。本 Task 先建立 stub：`export function ScenarioPicker() { return null }`。

- [ ] **Step 7: 手動驗證（重點驗證「不影響瀏覽頁面」）**

Run: `npm run dev`

**收合行為**
1. 預設為 mini 窄橫條，右下角
2. 點「展開」→ 面板出現。**確認頁面內容的寬度完全沒有變化**（開一個有 gallery 的頁面，數一下每列幾張卡，展開前後必須相同）
3. 面板背景半透明毛玻璃，底下卡片仍看得見
4. 點面板外的頁面區域（例如某張卡片）→ **面板不關閉**，且卡片的點擊正常生效
5. 按 `` ` `` → 收成 hidden 只剩圓鈕；再按 `` ` `` → 回到 full
6. 按 `Esc` → 從 full 回到 mini
7. **在任一輸入框內按 `` ` `` → 正常輸入該字元，面板不動**
8. 點四個角落按鈕 → 面板移到對應角落；重整後位置與模式都保留
9. 面板內容超長時面板自身滾動，不會超出畫面

**功能**
10. 「+10 分」→ toast 顯示「已快轉 10 分鐘」與觸發的通知數；即將結標的拍賣狀態改變
11. 速度切 `10x` → 頂欄出現 `⏩ x10` 徽章，倒數明顯加快；切 `暫停` → 頂欄顯示暫停徽章，倒數停住
12. 在某筆拍賣詳細頁開控制台 → 「模擬出價」的拍賣下拉預設就是當前那筆並標「（當前頁面）」
13. 選另一家車商「加一級距」→ 頁面上的價格與出價紀錄立刻更新，若自己被超越則跳 toast
14. 勾「連續隨機出價」→ 每 3 秒價格上升；拍賣結標後自動停止
15. 「立即結標」→ 依規則結標（成交／議價／流標），不是硬改狀態
16. 「強制撤標」→ 直接撤標且不彈填寫視窗
17. 「推送通知」選一則給當前登入者 → 立刻跳 toast；選給另一個帳號 → 切換後在鈴鐺看到
18. 「切換角色」→ 立刻換人並跳到對應首頁

- [ ] **Step 8: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 9: Commit**

```bash
git add src/components/demo
git commit -m "feat: Demo 控制台（三段收合、時間、模擬出價、強制狀態、推送通知）"
```

---

## Task 24: 預設情境與重置

**Files:**
- Create: `src/data/scenarios.ts`
- Modify: `src/components/demo/ScenarioPicker.tsx`（取代 Task 23 的 stub）
- Test: `src/data/scenarios.test.ts`

**Interfaces:**
- Consumes: `buildSeed`、`placeBid`、`advanceAuctions`、`USERS`、`eventsToNotifications`
- Produces:
  - `SCENARIOS: ReadonlyArray<Scenario>`，`Scenario = { key: string; label: string; description: string; build(now: number): { data: EngineData; notifications: AppNotification[] } }`
  - `<ScenarioPicker />`

**設計方式**：每個情境都從 `buildSeed(now)` 出發再做調整，而非各自手寫一整份資料。這樣情境與 seed 不會走鐘，且新增車款或欄位時不必逐個修改。

- [ ] **Step 1: 寫情境的測試**

`src/data/scenarios.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '@/data/scenarios'
import { advanceAuctions } from '@/engine/advance'
import { DEALER_A_ID } from '@/data/users'
import { currentPrice, myHighestBid } from '@/store/selectors'

const NOW = new Date(2026, 6, 28, 12, 0, 0, 0).getTime()

describe('每個情境的基本健全性', () => {
  it('共有 6 個情境，key 不重複', () => {
    expect(SCENARIOS).toHaveLength(6)
    expect(new Set(SCENARIOS.map((s) => s.key)).size).toBe(6)
  })

  for (const scenario of SCENARIOS) {
    it(`「${scenario.label}」產生的資料立刻跑引擎不會噴事件`, () => {
      const { data } = scenario.build(NOW)
      let n = 0
      const r = advanceAuctions(data, NOW, () => `x${++n}`)
      expect(r.events).toEqual([])
    })

    it(`「${scenario.label}」的車輛狀態與拍賣狀態一致`, () => {
      const { data } = scenario.build(NOW)
      const expected: Record<string, string> = {
        未開始: '已排拍',
        進行中: '拍賣中',
        議價中: '拍賣中',
        已成交: '已售出',
        已流標: '在庫',
        已撤標: '已下架',
      }
      for (const a of data.auctions) {
        const v = data.vehicles.find((x) => x.id === a.vehicleId)!
        expect(v.status).toBe(expected[a.status])
      }
    })
  }
})

describe('各情境的關鍵條件', () => {
  const find = (key: string) => SCENARIOS.find((s) => s.key === key)!

  it('ending-soon：有一筆 2 分鐘內結標、出價 ≥ 8 次、山田領先的拍賣', () => {
    const { data } = find('ending-soon').build(NOW)
    const a = data.auctions.find((x) => x.status === '進行中' && x.endAt - NOW <= 120_000)!
    expect(a).toBeDefined()
    const bids = data.bids.filter((b) => b.auctionId === a.id)
    expect(bids.length).toBeGreaterThanOrEqual(8)
    const top = bids.reduce((best, b) => (b.amount > best.amount ? b : best))
    expect(top.dealerId).toBe(DEALER_A_ID)
  })

  it('outbid：山田有出價但不領先，且有一則未讀 OUTBID', () => {
    const { data, notifications } = find('outbid').build(NOW)
    const a = data.auctions.find((x) => x.status === '進行中' && x.endAt > NOW)!
    expect(myHighestBid(data, a.id, DEALER_A_ID)).not.toBeNull()
    const top = data.bids.filter((b) => b.auctionId === a.id).reduce((best, b) => (b.amount > best.amount ? b : best))
    expect(top.dealerId).not.toBe(DEALER_A_ID)
    expect(notifications.some((n) => n.userId === DEALER_A_ID && n.type === 'OUTBID' && !n.read)).toBe(true)
  })

  it('extended：有一筆已延長 3 次（9 分鐘）的拍賣', () => {
    const { data } = find('extended').build(NOW)
    const a = data.auctions.find((x) => x.extendedMs === 9 * 60_000)!
    expect(a).toBeDefined()
    expect(a.endAt - a.originalEndAt).toBe(9 * 60_000)
  })

  it('negotiating：有一筆議價中，議價對象是山田', () => {
    const { data } = find('negotiating').build(NOW)
    const a = data.auctions.find((x) => x.status === '議價中')!
    expect(a.negotiation!.dealerId).toBe(DEALER_A_ID)
    expect(a.negotiation!.deadline).toBeGreaterThan(NOW)
    expect(currentPrice(data, a.id)!).toBeLessThan(a.reservePrice)
  })

  it('sealed：有一筆密封投標進行中、3 家投標、山田未投標', () => {
    const { data } = find('sealed').build(NOW)
    const a = data.auctions.find((x) => x.type === 'SEALED' && x.status === '進行中')!
    const bids = data.bids.filter((b) => b.auctionId === a.id)
    expect(new Set(bids.map((b) => b.dealerId)).size).toBe(3)
    expect(bids.some((b) => b.dealerId === DEALER_A_ID)).toBe(false)
  })

  it('proxy-war：兩家車商都有 active 代理，且價格已被推高', () => {
    const { data } = find('proxy-war').build(NOW)
    const a = data.auctions.find((x) => x.status === '進行中' && x.type !== 'SEALED')!
    const active = data.proxies.filter((p) => p.auctionId === a.id && p.active)
    expect(active.length).toBeGreaterThanOrEqual(1)
    expect(data.proxies.filter((p) => p.auctionId === a.id).length).toBe(2)
    expect(data.bids.some((b) => b.auctionId === a.id && b.kind === 'proxy')).toBe(true)
  })
})
```

- [ ] **Step 2: 實作 `src/data/scenarios.ts`**

```ts
import { buildSeed } from '@/data/seed'
import { ALL_DEALER_IDS, DEALER_A_ID, DEALER_B_ID, STAFF_ID } from '@/data/users'
import { advanceAuctions } from '@/engine/advance'
import { placeBid } from '@/engine/bid'
import { NEGOTIATION_WINDOW_MS } from '@/engine/rules'
import { bidStepFor } from '@/lib/money'
import type { AppNotification, Auction, Bid, EngineData } from '@/types'

export type Scenario = {
  key: string
  label: string
  description: string
  build: (now: number) => { data: EngineData; notifications: AppNotification[] }
}

const MIN = 60_000
const HOUR = 3_600_000

/** 取一筆進行中的公開競價來改造 */
function pickRunning(data: EngineData, id = 'a-run-normal'): Auction {
  return data.auctions.find((a) => a.id === id)!
}

function replaceAuction(data: EngineData, next: Auction): EngineData {
  return { ...data, auctions: data.auctions.map((a) => (a.id === next.id ? next : a)) }
}

/** 清掉某筆拍賣的所有出價，重新鋪一條指定的階梯 */
function relayBids(
  data: EngineData,
  auctionId: string,
  ladder: Array<{ dealerId: string; amount: number; at: number; kind?: Bid['kind'] }>,
): EngineData {
  const others = data.bids.filter((b) => b.auctionId !== auctionId)
  const fresh: Bid[] = ladder.map((x, i) => ({
    id: `sc-${auctionId}-${i}`,
    auctionId,
    dealerId: x.dealerId,
    amount: x.amount,
    at: x.at,
    kind: x.kind ?? 'manual',
  }))
  return { ...data, bids: [...others, ...fresh] }
}

/** 從起標價往上疊 count 級，交錯指定的車商 */
function ladderFrom(
  auction: Auction,
  count: number,
  dealers: string[],
  startAt: number,
  spacingMs: number,
) {
  const out: Array<{ dealerId: string; amount: number; at: number }> = []
  let price = auction.startPrice
  for (let i = 0; i < count; i++) {
    out.push({ dealerId: dealers[i % dealers.length], amount: price, at: startAt + i * spacingMs })
    price += bidStepFor(price, auction.stepMode, auction.fixedStep)
  }
  return out
}

function note(
  userId: string,
  type: AppNotification['type'],
  auctionId: string,
  title: string,
  body: string,
  at: number,
  read = false,
): AppNotification {
  return { id: `sc-n-${userId}-${type}-${auctionId}`, userId, type, auctionId, title, body, at, read }
}

export const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    key: 'ending-soon',
    label: '即將結標的熱門車',
    description: '剩 2 分鐘、已有 8 次出價、山田商事目前領先',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = pickRunning(data)
      // 8 筆出價，最後一筆由山田出價（因此領先）
      const dealers = [DEALER_B_ID, 'd-sato', DEALER_A_ID, 'd-ito', DEALER_B_ID, 'd-sato', 'd-ito', DEALER_A_ID]
      data = relayBids(data, base.id, ladderFrom(base, 8, dealers, now - 6 * HOUR, 40 * MIN))
      const next: Auction = {
        ...base,
        endAt: now + 2 * MIN,
        originalEndAt: now + 2 * MIN,
        extendedMs: 0,
        emittedKeys: [...base.emittedKeys, `ENDING_SOON:${now + 2 * MIN}`, `BELOW_RESERVE:${now + 2 * MIN}`],
      }
      data = replaceAuction(data, next)
      return {
        data,
        notifications: [
          ...seed.notifications,
          note(DEALER_A_ID, 'ENDING_SOON', base.id, '拍賣即將結標', '您領先的拍賣即將結標。', now - 30_000),
        ],
      }
    },
  },

  {
    key: 'outbid',
    label: '你被超越了',
    description: '山田商事剛被鈴鐺自動車超越，通知已在鈴鐺裡',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = pickRunning(data)
      // 山田先出，鈴鐺最後出（因此山田被超越）
      const dealers = [DEALER_A_ID, 'd-sato', DEALER_A_ID, DEALER_B_ID]
      data = relayBids(data, base.id, ladderFrom(base, 4, dealers, now - 3 * HOUR, 30 * MIN))
      data = replaceAuction(data, { ...base, endAt: now + 6 * HOUR, originalEndAt: now + 6 * HOUR })
      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'OUTBID',
            base.id,
            '您的出價已被超越',
            '這筆拍賣已有更高出價，請確認是否加價。',
            now - 20_000,
          ),
        ],
      }
    },
  },

  {
    key: 'extended',
    label: '軟結標延長中',
    description: '已延長 3 次共 9 分鐘，倒數旁顯示延長標記',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = pickRunning(data)
      const dealers = [DEALER_B_ID, DEALER_A_ID, 'd-sato', DEALER_B_ID, DEALER_A_ID]
      data = relayBids(data, base.id, ladderFrom(base, 5, dealers, now - 2 * HOUR, 20 * MIN))
      const endAt = now + 90_000
      data = replaceAuction(data, {
        ...base,
        endAt,
        originalEndAt: endAt - 9 * MIN,
        extendedMs: 9 * MIN,
        emittedKeys: [...base.emittedKeys, `ENDING_SOON:${endAt}`, `BELOW_RESERVE:${endAt}`],
      })
      return {
        data,
        notifications: [
          ...seed.notifications,
          note(DEALER_A_ID, 'EXTENDED', base.id, '結標時間已延長', '因結標前有新出價，結標時間延長 3 分鐘。', now - 60_000),
        ],
      }
    },
  },

  {
    key: 'negotiating',
    label: '議價中',
    description: '山田商事的出價未達底價，收到議價邀請',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = pickRunning(data)
      // 最高價設在底價的 94%（落在 10% 議價門檻內），由山田持有
      const top = Math.round((base.reservePrice * 0.94) / 10_000) * 10_000
      const step = bidStepFor(top, base.stepMode, base.fixedStep)
      data = relayBids(data, base.id, [
        { dealerId: DEALER_B_ID, amount: top - step * 2, at: now - 5 * HOUR },
        { dealerId: 'd-sato', amount: top - step, at: now - 4 * HOUR },
        { dealerId: DEALER_A_ID, amount: top, at: now - 3 * HOUR },
      ])
      data = replaceAuction(data, {
        ...base,
        status: '議價中',
        endAt: now - 2 * HOUR,
        originalEndAt: now - 2 * HOUR,
        negotiation: {
          dealerId: DEALER_A_ID,
          amount: base.reservePrice,
          deadline: now + 20 * HOUR,
          declinedDealerIds: [],
        },
      })
      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'NEGOTIATION_INVITE',
            base.id,
            '議價邀請',
            '您的出價未達底價，加價後即可成交，請於 24 小時內決定。',
            now - 2 * HOUR,
          ),
        ],
      }
    },
  },

  {
    key: 'sealed',
    label: '密封投標開標前',
    description: '3 家已投標、金額全部隱藏，山田商事尚未投標',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = data.auctions.find((a) => a.id === 'a-run-sealed')!
      const others = ALL_DEALER_IDS.filter((d) => d !== DEALER_A_ID).slice(0, 3)
      const step = bidStepFor(base.startPrice, base.stepMode, base.fixedStep)
      data = relayBids(
        data,
        base.id,
        others.map((dealerId, i) => ({
          dealerId,
          amount: base.startPrice + step * (i + 1) * 3,
          at: now - (i + 1) * HOUR,
        })),
      )
      data = replaceAuction(data, { ...base, endAt: now + 12 * HOUR, originalEndAt: now + 12 * HOUR })
      return { data, notifications: seed.notifications }
    },
  },

  {
    key: 'proxy-war',
    label: '代理出價互頂',
    description: '兩家車商都設了代理，價格自動被推到其中一方上限',
    build: (now) => {
      const seed = buildSeed(now)
      let data = seed.data
      const base = pickRunning(data)
      data = relayBids(data, base.id, [])
      data = replaceAuction(data, { ...base, endAt: now + 8 * HOUR, originalEndAt: now + 8 * HOUR })

      const step = bidStepFor(base.startPrice, base.stepMode, base.fixedStep)
      const lowMax = base.startPrice + step * 12
      const highMax = base.startPrice + step * 20

      data = {
        ...data,
        proxies: [
          ...data.proxies.filter((p) => p.auctionId !== base.id),
          { auctionId: base.id, dealerId: DEALER_B_ID, maxAmount: lowMax, active: true, createdAt: now - 2 * HOUR },
          { auctionId: base.id, dealerId: 'd-sato', maxAmount: highMax, active: true, createdAt: now - HOUR },
        ],
      }

      // 讓引擎真的跑一次互頂，結果才與規則一致
      let seq = 0
      const nextId = () => `sc-pw-${++seq}`
      const first = placeBid(data, {
        auctionId: base.id,
        dealerId: DEALER_A_ID,
        amount: base.startPrice,
        now: now - 30 * MIN,
        nextId,
      })
      data = first.data

      // 重新預填事件鍵，避免載入後立刻噴通知
      const after = data.auctions.find((a) => a.id === base.id)!
      data = replaceAuction(data, {
        ...after,
        emittedKeys: [...new Set([...after.emittedKeys, 'STARTED'])],
      })

      return {
        data,
        notifications: [
          ...seed.notifications,
          note(
            DEALER_A_ID,
            'OUTBID',
            base.id,
            '您的出價已被超越',
            '對方設有代理出價，價格已被自動推高。',
            now - 29 * MIN,
          ),
        ],
      }
    },
  },
]
```

`proxy-war` 刻意呼叫真正的 `placeBid` 讓引擎跑出互頂結果，而不是手寫預期的出價序列——這樣情境展示的一定是規則的真實行為。

- [ ] **Step 3: 執行測試，修到通過**

Run: `npx vitest run src/data/scenarios.test.ts`
Expected: 全部 PASS

若「立刻跑引擎不會噴事件」失敗，多半是改了 `endAt` 卻沒同步更新 `emittedKeys` 裡的 `ENDING_SOON:${endAt}` / `BELOW_RESERVE:${endAt}`。

- [ ] **Step 4: 實作 `src/components/demo/ScenarioPicker.tsx`**

```tsx
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useClock } from '@/clock/clockStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import { DEALER_A_ID } from '@/data/users'
import { useStore } from '@/store/index'

export function ScenarioPicker() {
  const store = useStore()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Scenario | null>(null)
  const [resetOpen, setResetOpen] = useState(false)

  function apply(scenario: Scenario) {
    const now = useClock.getState().virtualNow()
    store.replaceAll(scenario.build(now))
    // 情境都以山田商事的視角設計
    store.login(DEALER_A_ID)
    navigate('/dealer/auctions')
    toast.success(`已載入情境：${scenario.label}`, { description: scenario.description })
    setPending(null)
  }

  return (
    <>
      <div className="space-y-1">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setPending(s)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-left transition hover:border-slate-400"
          >
            <span className="block text-xs font-medium">{s.label}</span>
            <span className="block text-xs leading-snug text-slate-500">{s.description}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full text-rose-700 hover:bg-rose-50"
        onClick={() => setResetOpen(true)}
      >
        <RotateCcw className="mr-1 size-3" /> 重置為初始資料
      </Button>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>載入情境「{pending?.label}」</DialogTitle>
            <DialogDescription>
              這會覆蓋目前所有拍賣、出價與通知資料，並切換為山田商事的視角。此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button onClick={() => pending && apply(pending)}>確認載入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置為初始資料</DialogTitle>
            <DialogDescription>
              會清掉所有出價、通知與變更，回到剛開站的乾淨狀態，並登出當前帳號。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                useClock.getState().resetToReal()
                store.reset(useClock.getState().virtualNow())
                setResetOpen(false)
                navigate('/login')
                toast.success('已重置為初始資料')
              }}
            >
              確認重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 5: 手動驗證**

Run: `npm run dev`

1. 六個情境按鈕都列在控制台「場景」區
2. 點任一個 → 彈確認 Dialog 說明會覆蓋資料
3. 「即將結標的熱門車」→ 切到山田視角、拍賣列表第一張卡剩約 2 分鐘、8 次出價、標「您目前領先」
4. 「你被超越了」→ 卡片標「您已被超越」，鈴鐺有未讀 OUTBID
5. 「軟結標延長中」→ 倒數旁有「已延長 9 分」
6. 「議價中」→ 進詳細頁看到琥珀色議價邀請與兩個按鈕
7. 「密封投標開標前」→ 顯示「共 3 家投標」、「尚未投標」，出價紀錄不揭露
8. 「代理出價互頂」→ 出價紀錄有多筆「代理」標記，價格已被推高
9. **載入任一情境後不會爆出一堆 toast**
10. 「重置為初始資料」→ 確認後回到登入頁，資料回到 14 筆拍賣的初始狀態

- [ ] **Step 6: 確認建置與測試**

Run: `npm test && npm run typecheck && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/data/scenarios.ts src/data/scenarios.test.ts src/components/demo/ScenarioPicker.tsx
git commit -m "feat: 六組預設情境與資料重置"
```

---

## Task 25: 視覺打磨與端到端驗證

**Files:**
- Modify: `src/index.css`、各元件的樣式細節
- Create: `README.md`

**Interfaces:**
- Consumes: 全部
- Produces: `README.md`

- [ ] **Step 1: 用 frontend-design skill 定調視覺細節**

呼叫 `frontend-design` skill，帶入以下已定的方向，請它補齊字體、強調色與間距節奏：

> 日系車拍平台（USS／TAA）的高密度工具感，不做鬆散的行銷風。已定：深色頂欄 slate-900、淺灰工作區 slate-50、白卡片、金額用 tabular-nums、狀態色票（未開始 slate／進行中 emerald／議價中 amber／已流標 rose／已成交 blue／已撤標 slate 加刪除線）、倒數 5 分鐘內轉紅脈動。需要決定：字體堆疊（含日文與中文字型 fallback）、單一強調色、卡片圓角與陰影層級、表格與清單的行高節奏。

把結果套進 `src/index.css` 的 `@theme` 與相關元件。

- [ ] **Step 2: 統一檢查底價隔離**

用 grep 確認車商可見的頁面完全沒有引用底價相關欄位：

```bash
grep -rn "reservePrice\|loanBalance\|maxAmount\|ReserveHint" src/pages/dealer src/components/auction/BidPanel.tsx src/components/auction/BidHistory.tsx
```

Expected：
- `src/pages/dealer/**` 只允許出現在 `NegotiationPanel` 傳入的 `negotiation.amount`（那是刻意揭露給被邀請車商的金額），**不得出現 `reservePrice`、`loanBalance`、`ReserveHint`**
- `ProxyBidPanel` 可以出現 `maxAmount`（那是車商自己的上限，只有本人看得到）
- `BidHistory` 不得出現 `maxAmount`

若有違規，移除該引用。

- [ ] **Step 3: 撰寫 README.md**

```markdown
# 車輛拍賣平台 —— 純前端 Demo

零後端、假資料的可操作 Demo，用於展示抵押車輛線上拍賣平台的功能與拍賣機制。

## 快速開始

```bash
npm install
npm run dev
```

開站後在登入頁點任一帳號即可進入，不需密碼。

| 帳號 | 角色 | 用途 |
|---|---|---|
| 田中 健一 · 拍賣營運 | 公司人員 | 車庫與拍賣管理，可看底價 |
| 山田商事 | 二手車商 | 主要示範視角 |
| 鈴木自動車 | 二手車商 | 用來演示競價與被超越 |

## Demo 控制台

右下角的浮動控制台可以手動觸發任何狀態改變，不必等真實時間流逝。

- **快捷鍵**：`` ` `` 開合、`Esc` 收起
- **三段收合**：圓鈕 → 窄橫條 → 完整面板。可切到四個角落，位置會被記住
- **功能**：時間快轉與加速、模擬其他車商出價、強制開標／結標／流標／議價／撤標、推送任意通知、切換角色、載入六組預設情境、重置資料

示範時建議直接用「場景」區的預設情境，一鍵就是要展示的畫面。

## 資料

全部為假資料，狀態存在 localStorage。控制台的「重置為初始資料」可回到乾淨狀態。

車輛照片來自 loremflickr；無網路時自動改用本地產生的 SVG，不會出現破圖。

## 架構

一個虛擬時鐘驅動一組純函式引擎（`src/engine/`），引擎回傳新資料與事件，事件再轉成通知。所有頁面只讀 store，不含狀態轉換邏輯。

```
src/
  engine/    拍賣規則（純函式，有測試）
  clock/     虛擬時鐘
  store/     zustand + localStorage
  data/      假資料與預設情境
  components/
  pages/
```

## 指令

```bash
npm run dev        # 開發伺服器
npm test           # 引擎測試
npm run typecheck  # 型別檢查
npm run build      # 建置
```

## 相關文件

- 設計規格：`docs/superpowers/specs/2026-07-28-auction-demo-frontend-design.md`
- 產品提案：`docs/superpowers/specs/2026-07-27-vehicle-auction-platform-proposal.md`

## 未納入 Demo 的範圍

不做真登入驗證、保證金與信用額度、車商註冊審核、報表、稅務與交割流程、圖片上傳、多語系。手機版僅保證 ≥ 768px 可正常操作。
```

- [ ] **Step 4: 端到端驗證：完整走完一次拍賣**

Run: `npm run dev`，依序執行並確認每一步：

1. 控制台「重置為初始資料」
2. 以公司人員登入 → 車庫列表 → 挑一台在庫車 → 「排拍」
3. 拍賣編輯頁：選定時開標、開始時間設為 5 分鐘後、結標設為 20 分鐘後、起標價 60 萬、底價 100 萬、喊價單位自動 → 建立
4. 拍賣列表出現該筆「未開始」，車輛狀態變「已排拍」
5. 控制台「立即開標」→ 狀態變「進行中」，車輛變「拍賣中」
6. 切換為山田商事 → 拍賣列表找到該筆 → 進詳細頁 → 加入關注 → 出價 60 萬
7. 控制台選鈴鐺自動車「加一級距」→ 山田收到 OUTBID toast
8. 山田設定自動出價上限 90 萬
9. 控制台再讓鈴鐺出價 70 萬 → 山田的代理自動反超到 71 萬
10. 控制台快轉到結標前 2 分鐘內，讓鈴鐺再出一次 → 倒數旁出現「已延長 3 分」
11. 控制台「立即結標」→ 因最高價未達 100 萬底價但差距在 10% 內 → 狀態變「議價中」，山田收到議價邀請
12. 山田在詳細頁點「加價至 ¥1,000,000 成交」→ 狀態變「已成交」，車輛變「已售出」
13. 切回公司人員 → 監控頁看到成交紀錄、匿名出價紀錄與代理標記、通知裡有「拍賣已成交」
14. **重整瀏覽器 → 以上所有狀態都還在**

- [ ] **Step 5: 驗證「控制台不影響瀏覽頁面」**

1. 在 `/dealer/auctions` 數清楚每列有幾張卡片
2. 展開控制台 → **每列卡片數必須完全相同**，頁面沒有橫向滾動條
3. 點控制台外的卡片 → 卡片正常跳頁，控制台保持展開
4. 把控制台切到左上角 → 確認不遮住頂欄的鈴鐺與角色下拉

- [ ] **Step 6: 驗證離線降級**

1. 在瀏覽器 DevTools 把網路設為 Offline
2. 重整 → 頁面正常載入（純前端），照片全部變成本地 SVG，**沒有破圖、沒有無限 loading**
3. 出價、快轉、切換角色都正常運作

- [ ] **Step 7: 最終檢查**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、無型別錯誤、建置成功

檢查 `npm run build` 的輸出沒有警告未使用的檔案；若有 Task 13 留下但已被取代的 placeholder，刪掉。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 視覺打磨、README 與端到端驗證"
```

---

## Self-Review 紀錄

**規格覆蓋對照**

| 規格章節 | 對應 Task |
|---|---|
| 2 技術選型 | 1 |
| 3 架構（虛擬時鐘 + 引擎） | 7、10、13（EngineRunner） |
| 4 資料模型 | 2 |
| 5.1 出價級距 | 3 |
| 5.2 三種拍賣方式 | 4、6、18 |
| 5.3 軟結標 | 4、6 |
| 5.4 代理出價 | 5、6、21 |
| 5.5 結標判定 | 4、7 |
| 5.5 密封標不可修改 | 6、21 |
| 5.6 車輛狀態連動 | 7、8、11 |
| 5.7 匿名代號 | 12、19 |
| 5.8 撤標 | 8、19、23 |
| 6 角色與帳號 | 11、13 |
| 7.1 登入頁 | 13 |
| 7.2 導覽 | 13 |
| 7.3 車庫列表 | 15 |
| 7.4 車庫編輯 | 16 |
| 7.5 公司拍賣列表 | 17 |
| 7.6 拍賣編輯（唯讀守衛） | 18 |
| 7.7 拍賣監控 | 19 |
| 7.8 車商拍賣列表 | 20 |
| 7.9 車商詳細頁 | 21 |
| 7.10 關注清單、通知頁 | 20、22 |
| 8 通知 | 9、22 |
| 9 Demo 控制台 | 23 |
| 9.3 預設情境 | 24 |
| 10 假資料 | 11 |
| 11 視覺方向 | 14、25 |
| 12 測試策略 | 3–12、24 |

規格 12 節列的 24 個測試案例全部對應到 Task 3–9 的測試碼，另在 Task 11、12、24 補上 seed、store、情境的測試。

**已修正的問題**

1. Task 13 的 `TopBar` 引用 Task 22 才實作的 `NotificationBell`、`AppShell` 引用 Task 23 才實作的 `DemoConsole` → 已在 Task 13 補上兩個 stub 的完整程式碼
2. Task 6 的測試自行定義 fixture，與 Task 7 重複 → Task 7 Step 6 明確要求改用共用 `testFixtures.ts`
3. `AuctionFilter.statuses`（`AuctionStatus[]`）與 `VehicleFilter.statuses`（`VehicleStatus[]`）型別衝突 → `filterAuctions` 組 `vehicleFilter` 時不傳 `statuses`，已在 Task 12 註明
4. `Notification` 與瀏覽器內建全域型別衝突 → 型別命名為 `AppNotification`
5. 虛擬時鐘若走 zustand persist 會每秒寫 4 次 localStorage → 時鐘獨立成不持久化的 store，offset 自行節流寫入
6. seed 產生的資料若不預填 `emittedKeys`，開站會爆一堆 toast → `prefillEmittedKeys` 並以測試釘住

---

**文件結束**
