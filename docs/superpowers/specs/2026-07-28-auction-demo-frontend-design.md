# 車輛拍賣平台 —— 純前端 Demo 設計規格

**日期**：2026-07-28
**狀態**：待審閱
**上游文件**：[2026-07-27-vehicle-auction-platform-proposal.md](./2026-07-27-vehicle-auction-platform-proposal.md)

---

## 1. 目標與範圍

做一個**可點擊操作的純前端 Demo**，把上游提案的第一／第二階段機制變成看得到、摸得到的畫面，用於內部討論與對車商展示。

**是**

- 純前端 SPA，零後端、零網路 API 呼叫
- 假資料，狀態存 localStorage
- 能完整走完一次拍賣：上架 → 開標 → 競價 → 結標（成交／議價／流標）
- 有一個 Demo 控制台可以手動觸發任何狀態改變與通知

**不是**

- 不做真的登入驗證（點帳號卡即進入）
- 不做保證金／信用額度、車商註冊審核、報表、稅務、交割流程
- 不做圖片上傳（照片由套件產生，可重抽）
- 不做多語系
- 不精修手機版（保證 ≥ 768px 可正常操作即可）

**幣別**日圓　**介面語言**繁體中文

---

## 2. 技術選型

| 項目 | 選擇 | 理由 |
|---|---|---|
| 建置 | Vite + React 19 + TypeScript | 純 SPA，無 server 概念 |
| 樣式 | Tailwind CSS v4 | 高密度資料介面調整快 |
| 元件 | shadcn/ui | 表單、Dialog、Select、Toast 現成，品質高 |
| 路由 | React Router v7（declarative mode） | 不需要 framework 功能 |
| 狀態 | Zustand + `persist` middleware | 極小、內建 localStorage 持久化 |
| 假資料 | `@faker-js/faker` v10 | VIN、車牌、公司名、人名、日期、數字 |
| 測試 | Vitest | 只測引擎 |

---

## 3. 架構總覽

核心決定：**不在頁面裡各自寫倒數與狀態轉換**，集中成一個純函式引擎。

```
虛擬時鐘  { baseReal, baseVirtual, speed }
    │  virtualNow = baseVirtual + (Date.now() - baseReal) * speed
    ▼
每 250ms tick
    ▼
advanceAuctions(state, virtualNow) ──► { nextState, events[] }   ← 純函式
    ▼
events → notify() → 寫入 notifications，若收件者是當前使用者則跳 toast
    ▼
頁面只讀 state、只負責顯示
```

**為什麼這樣切**

- Demo 控制台的「時間 +10 分鐘」只要動 `baseVirtual`，引擎會把這 10 分鐘內該發生的事全部補跑完（含中途該發的通知），不必為每個快轉按鈕寫一套邏輯
- 引擎是唯一有真實邏輯的地方，也是唯一值得寫測試的地方
- 頁面完全無狀態邏輯，改版面不會弄壞規則

**引擎的冪等性要求**

`advanceAuctions` 對同一個 `now` 重複呼叫必須產生相同結果、不重複發通知。作法是每筆拍賣帶一個 `emittedKeys: string[]`，通知以 `${auctionId}:${type}:${seq}` 為鍵去重。快轉 1 天不會噴 50 則「即將結標」。

---

## 4. 資料模型

```ts
type Role = 'staff' | 'dealer'

type User = {
  id: string
  role: Role
  name: string           // 田中 健一 / 山田 太郎
  company?: string       // 車商才有
  canSeeReserve: boolean // 公司人員 true
}

type Vehicle = {
  id: string
  orderNo: string        // ORD-2026-0142，篩選用
  brand: string          // Toyota
  model: string          // Alphard
  year: number
  mileage: number        // km
  plate: string
  vin: string
  displacement: number   // cc
  fuel: '汽油' | '柴油' | '油電' | '電動'
  transmission: 'AT' | 'MT' | 'CVT'
  drive: 'FF' | 'FR' | '4WD'
  color: string
  seats: number
  bodyType: '房車' | 'SUV' | '七人車' | '輕自動車' | '商用車'
  grade: 'S' | '5' | '4.5' | '4' | '3.5' | '3' | '2' | 'R'  // 車體評級
  interiorGrade: 'A' | 'B' | 'C' | 'D'
  photos: string[]
  remarks: string
  loanBalance: number    // 貸款未償餘額，僅公司人員可見
  status: '在庫' | '已排拍' | '拍賣中' | '已售出' | '已下架'
  createdAt: number
}

type AuctionType = 'SCHEDULED' | 'LIVE' | 'SEALED'
// SCHEDULED 定時開標 / LIVE 即時同步拍 / SEALED 密封投標

type AuctionStatus = '未開始' | '進行中' | '議價中' | '已流標' | '已成交' | '已撤標'

type Auction = {
  id: string
  vehicleId: string
  type: AuctionType
  status: AuctionStatus
  startAt: number
  endAt: number             // 軟結標會往後推
  originalEndAt: number     // 原定結標時間，UI 顯示「已延長」用
  startPrice: number
  reservePrice: number      // 隱藏底價，車商看不到
  stepMode: 'auto' | 'fixed'
  fixedStep?: number        // stepMode === 'fixed' 時的最小喊價單位
  buyNowPrice?: number      // 僅 SEALED 可設，立即成交價
  extendedMs: number        // 累計延長毫秒數
  withdrawReason?: string
  withdrawnBy?: string
  closeReason?: '無人出價' | '未達底價' | '議價失敗'
  deal?: { dealerId: string; amount: number; at: number }
  negotiation?: {
    dealerId: string
    amount: number
    deadline: number
    declinedDealerIds: string[]
  }
  emittedKeys: string[]
  createdAt: number
}

type Bid = {
  id: string
  auctionId: string
  dealerId: string
  amount: number
  at: number
  kind: 'manual' | 'proxy'
}

type ProxyBid = {
  auctionId: string
  dealerId: string
  maxAmount: number
  active: boolean
  createdAt: number
}

type Watch = { auctionId: string; dealerId: string }

type NotificationType =
  | 'OUTBID' | 'ENDING_SOON' | 'EXTENDED' | 'WON' | 'LOST'
  | 'NEGOTIATION_INVITE' | 'WATCHED_NEW_BID' | 'WATCHED_STARTED' | 'WITHDRAWN'
  | 'NO_BID_ALERT' | 'ENDING_BELOW_RESERVE' | 'AUCTION_CLOSED'

type Notification = {
  id: string
  userId: string
  type: NotificationType
  auctionId: string
  title: string
  body: string
  at: number
  read: boolean
}
```

---

## 5. 拍賣規則

### 5.1 出價級距

`stepMode: 'auto'` 依價格分段（沿用上游提案 3.4，換算為日圓）：

| 目前價格 | 最小加價 |
|---|---|
| < ¥500,000 | ¥5,000 |
| ¥500,000 – ¥2,000,000 | ¥10,000 |
| ≥ ¥2,000,000 | ¥50,000 |

`stepMode: 'fixed'` 則一律使用 `fixedStep`。拍賣上架編輯頁提供這兩個選項。

合法出價 = `目前最高價 + step`（無人出價時 = `startPrice`）。手動輸入金額必須 ≥ 合法出價，且與起標價的差額為 step 的整數倍。

### 5.2 三種拍賣方式的差異

| | 定時開標 | 即時同步拍 | 密封投標 |
|---|---|---|---|
| 車商看得到目前最高價 | ✅ | ✅ | ❌ 只看得到自己的出價與「共 N 家投標」 |
| 出價者身分 | 匿名（出價者 A/B/C） | 匿名 | 不揭露 |
| 軟結標窗口 | 結標前 3 分鐘 → 延 3 分鐘 | 結標前 15 秒 → 延 15 秒 | 無 |
| 延長上限 | 累計 60 分鐘 | 無上限 | — |
| 立即成交價 | ❌ | ❌ | ✅ 可設 |
| 代理出價 | ✅ | ✅ | ❌（只投一次） |
| 典型長度 | 3–7 天 | 90 秒 | 2–3 天 |

### 5.3 軟結標

```
若 now 距 endAt < 窗口 且 此刻有新出價：
    延長量 = 窗口長度
    若 extendedMs + 延長量 > 上限（定時開標 60 分鐘）→ 只延到上限
    endAt += 延長量；extendedMs += 延長量
    發 EXTENDED 通知給所有出價者與關注者
```

### 5.4 代理出價解析

任何出價落地後執行：

```
loop（最多 50 次，防兩方互頂無限迴圈）:
    leader = 目前最高出價者
    candidates = 所有 active proxy，排除 leader，且 maxAmount ≥ 目前價 + step
    若 candidates 為空 → break
    winner = candidates 中 maxAmount 最大者（相同則 createdAt 較早者）
    代出金額 = min(winner.maxAmount, 目前價 + step)
    寫入 Bid { kind: 'proxy' }
    對被超越者發 OUTBID
```

代理上限被超過時，該 proxy 標記 `active = false`，並對該車商發 OUTBID（內文說明「已達您設定的上限」）。

**代理上限屬機密**：公司人員在監控頁看不到 `maxAmount`，只看得到「該筆為代理出價」。

### 5.5 結標判定

`now ≥ endAt` 時執行（SEALED 此刻才開標、揭露所有投標）：

```
若 無出價                                        → 已流標（無人出價）
若 最高價 ≥ reservePrice                         → 已成交
若 (reservePrice - 最高價) / reservePrice < 10%  → 議價中
否則                                             → 已流標（未達底價）
```

進入議價中時：`negotiation = { dealerId: 最高出價者, amount: reservePrice, deadline: now + 24h }`，發 NEGOTIATION_INVITE。

議價期限到 → 換問下一位（把當前 dealerId 推進 `declinedDealerIds`，取次高出價者，deadline 重設 24h）。沒有下一位 → 已流標（議價失敗）。

**立即成交價**：SEALED 收到 ≥ `buyNowPrice` 的投標時立刻結標為已成交，不等 `endAt`。

**密封投標不可修改**：每家車商每筆密封拍賣只能投一次，投出後 UI 改為顯示「您已投標 ¥X」，不提供修改或撤回。

### 5.6 車輛狀態連動

車輛狀態由拍賣狀態驅動，不獨立編輯：

| 拍賣事件 | 車輛狀態 |
|---|---|
| 建立拍賣（未開始） | 在庫 → 已排拍 |
| 開標 | 已排拍 → 拍賣中 |
| 成交 | 拍賣中 → 已售出 |
| 流標 | 拍賣中 → 在庫（可重新排拍） |
| 撤標 | → 已下架 |
| 議價中 | 維持拍賣中 |

### 5.7 出價者匿名代號

定時開標與即時同步拍顯示「出價者 A / B / C」。代號**依該筆拍賣內首次出價的先後順序**指派，並在該拍賣的生命週期內固定不變（同一車商在不同拍賣可能是不同代號，這是刻意的，避免跨拍賣追蹤）。車商在自己出的價旁看得到「（您）」標記。

### 5.8 撤標

公司人員可對「未開始」或「進行中」的拍賣撤標，**強制填寫理由（≥ 5 字）**。撤標後：

- 拍賣 → 已撤標，車輛 → 已下架
- 對所有出價者與關注者發 WITHDRAWN
- 車商端只顯示「已下架」，**不顯示理由**（上游提案 3.9：理由涉及借款人資料）
- 公司人員在監控頁看得到理由與操作人

---

## 6. 角色與帳號

登入頁放三張示範帳號卡，點卡即進入，不驗證密碼。

| 卡片 | 角色 | 說明 |
|---|---|---|
| 田中 健一 · 拍賣營運 | staff | 車庫、拍賣管理，可看底價與貸款餘額 |
| 山田商事 · 山田 太郎 | dealer | 主要示範用車商 |
| 鈴木自動車 · 鈴木 一郎 | dealer | 用來演示「別人出價」與「被超越」 |

需要兩個可登入的車商帳號，才能不靠模擬器就手動演示競價。另有 4 家不可登入的假車商，僅作為出價來源。

---

## 7. 頁面規格

### 7.1 `/login`

三張帳號卡（頭像、姓名、角色徽章、一行權限說明）。點擊後依角色導向 `/admin/garage` 或 `/dealer/auctions`。

### 7.2 導覽

**頂欄**（固定，深色）：平台名稱 · 虛擬時間（加速中掛 `⏩ x10` 徽章）· 🔔 通知鈴鐺（未讀數）· 角色徽章 + 下拉（切換角色／登出）

**左側欄**（固定，可收合成 icon-only）：

| 公司人員 | 二手車商 |
|---|---|
| 車庫管理（在庫台數） | 拍賣列表（進行中數） |
| 拍賣管理（進行中數） | 關注清單（關注數） |
| | 通知（未讀數） |

視窗 < 1024px 時側欄自動收成 icon，可用漢堡鈕開成 overlay。編輯頁以「← 返回列表」回上層，不做麵包屑。

### 7.3 `/admin/garage` 車庫列表

- **版型** gallery 卡片（響應式 1／2／3／4 欄）
- **卡片內容** 主圖、廠牌 車型 年份、里程、評級徽章、訂單號、狀態徽章、`編輯`／`排拍` 按鈕
- **篩選** 廠牌（多選）· 年份（區間 select）· 訂單號（文字搜尋，部分比對）· 狀態
- **排序** 最新入庫／年份／里程
- 篩選條件寫進 URL query，可分享連結
- 空狀態顯示「沒有符合條件的車輛」＋清除篩選按鈕
- 右上角 `+ 新增車輛`

### 7.4 `/admin/garage/new`、`/admin/garage/:id/edit` 車庫上架編輯表單

分區塊：

1. **基本資料** 訂單號、廠牌、車型、年份、車牌、VIN
2. **規格** 里程、排氣量、燃料、變速箱、驅動、顏色、座位數、車型分類
3. **車況** 車體評級（S/5/4.5/4/3.5/3/2/R）、內裝評級（A–D）、備註
4. **照片** 網格顯示，每張可刪除；`重新產生照片` 按鈕換一組（不做真上傳）
5. **內部資訊**（僅 staff 可見，底色區隔）貸款未償餘額

必填欄位驗證，存檔前顯示「將以此內容顯示給車商」的預覽 Dialog。

### 7.5 `/admin/auctions` 拍賣列表

- **版型** gallery 卡片
- **卡片內容** 車輛主圖、車輛一行摘要、拍賣方式徽章、狀態徽章、目前最高價、出價筆數、剩餘時間倒數（< 5 分鐘轉紅）、距底價指示（`已達底價` ／ `尚差 ¥XX`）、已延長標記
- **篩選** 拍賣方式（定時／即時／密封）· 狀態（六種）
- 已成交卡片顯示結標金額與得標車商；已流標顯示流標原因；已撤標卡片灰階 + 刪除線
- 右上角 `+ 新增拍賣`

### 7.6 `/admin/auctions/new`、`/admin/auctions/:id/edit` 拍賣上架編輯

**只有「未開始」可編輯。** 其他狀態進入時整頁唯讀，頂部顯示提示條「此拍賣已<狀態>，無法編輯」，並提供前往監控頁的連結。

欄位：

1. **選擇車輛** 從「在庫」車輛中挑（縮圖搜尋清單）。編輯既有拍賣時，該拍賣目前綁定的車輛（狀態為「已排拍」）也一併列出且預選
2. **拍賣方式** 三選一的卡片式 radio，每張卡下方一行說明該方式的行為差異
3. **時間** 開始時間、結標時間（`datetime-local`）；即時同步拍自動把結標時間預設為開始 +90 秒
4. **價格** 起標價、底價（標註「車商看不到」）
5. **喊價單位** `依價格自動分級`（顯示級距表）／`固定金額`（輸入框）
6. **立即成交價** 僅選密封投標時出現

驗證：結標時間 > 開始時間；底價 ≥ 起標價；立即成交價 > 底價。

### 7.7 `/admin/auctions/:id` 拍賣監控頁

- 頂部：車輛摘要 + 拍賣狀態 + 倒數
- 數據列：目前最高價 · 出價筆數 · 參與車商數 · 距底價 · 已延長 X 分鐘
- **出價紀錄時間軸** 時間、匿名出價者代號、金額、`代理` 標記。不顯示代理上限。
- **議價中** 顯示議價對象、金額、剩餘時限，操作：`接受目前最高價 ¥X` ／ `調整底價` ／ `放棄議價`
- **撤標** 按鈕（未開始／進行中才有），Dialog 強制填理由
- 已撤標時顯示理由與操作人

### 7.8 `/dealer/auctions` 車商拍賣列表

- **版型** gallery 卡片
- **卡片內容** 主圖、廠牌 車型 年份、里程、評級、訂單號、拍賣方式徽章、狀態徽章、目前最高價（密封標顯示「密封中」）、出價筆數、倒數、`關注` 星號、`我目前領先`／`您已被超越` 標記
- **篩選** 廠牌 · 年份 · 訂單號 · 拍賣方式 · 拍賣狀態，另有 `只看關注`／`只看我出價過的` 切換
- **已成交**卡片顯示結標金額；若得標者是自己另加 `您得標` 徽章
- **已流標**卡片打上流標標籤（灰底）
- **已撤標**顯示「已下架」，不顯示原因

### 7.9 `/dealer/auctions/:id` 拍賣詳細頁

左欄：照片輪播（縮圖列 + 主圖）、完整規格表、車況評級、備註

右欄（sticky）：

- 狀態 + 倒數（延長中顯示「已延長 X 分鐘」）
- 目前最高價 / 我的出價（密封標只顯示自己的）
- **出價區**
  - `+ 一級距（¥X）` 一鍵鈕
  - 自訂金額輸入（即時驗證，顯示「至少 ¥X」）
  - 送出前二次確認 Dialog：金額、與目前價差額、拍賣方式提醒
  - 金額 > 目前價 150% 時強制勾選「我確認金額無誤」
- **自動出價區** 設定上限金額 → 顯示「已設定代理出價至 ¥X」＋取消鈕，並說明機制（只出打敗對手所需的最小金額）
- **關注** 星號切換
- **議價中且對象是我** 顯示「加價至 ¥X 即可成交」＋`接受`／`放棄`
- 出價紀錄（匿名；密封標在結標前不顯示）

未開始 → 出價區替換為「開標時間：X」＋關注提示。已結束 → 顯示結果。

### 7.10 `/dealer/watchlist`、`/dealer/notifications`

- 關注清單：沿用拍賣列表卡片，只顯示已關注的
- 通知頁：完整通知清單（分組：今天／本週／更早），可標記全部已讀，點擊跳到對應拍賣

---

## 8. 通知

| 類型 | 觸發 | 收件者 |
|---|---|---|
| `OUTBID` | 出價被超越／代理上限用盡 | 被超越的車商 |
| `WATCHED_NEW_BID` | 關注的拍賣有新出價 | 關注者（排除出價者本人） |
| `WATCHED_STARTED` | 關注的拍賣開標 | 關注者 |
| `ENDING_SOON` | 結標前 10 分鐘 | 有出價或關注的車商 |
| `EXTENDED` | 軟結標延長 | 有出價或關注的車商 |
| `WON` | 得標 | 得標車商 |
| `LOST` | 未得標 | 其他出價者 |
| `NEGOTIATION_INVITE` | 進入議價 | 被邀請車商 |
| `WITHDRAWN` | 撤標 | 有出價或關注的車商 |
| `NO_BID_ALERT` | 開標滿 2 天無人出價 | 公司人員 |
| `ENDING_BELOW_RESERVE` | 結標前 1 小時未達底價 | 公司人員 |
| `AUCTION_CLOSED` | 結標（成交／流標） | 公司人員 |

**呈現**：頂欄鈴鐺未讀數 → 下拉面板（最近 8 則 + 「查看全部」）。新產生且收件者為當前使用者的通知同時跳 toast（右上，5 秒，可點擊跳轉）。其他使用者的通知照樣寫入資料，切換角色後看得到。

**去重**：見第 3 節的 `emittedKeys`。

---

## 9. Demo 控制台

### 9.1 收合行為

三段狀態，記在 localStorage：

| 狀態 | 樣子 |
|---|---|
| `hidden` | 右下角 48px 半透明 ⚙ 圓鈕，hover 變實心 |
| `mini` | 約 320×44 窄橫條：虛擬時間 · `+10m` · `⏩` · 展開鈕 |
| `full` | 360px 寬面板，毛玻璃半透明，可滾動，最高 80vh |

**不影響瀏覽頁面的具體約束**

- 全程 `position: fixed` overlay，**不使用 push 式 drawer**，頁面 layout 寬度永不改變
- 可拖曳到四個角落，位置存 localStorage
- 快捷鍵 `` ` `` 切換 hidden ↔ full，`Esc` 收起
- **點面板外不自動關閉**（需要邊操作邊看頁面反應）
- 不搶頁面鍵盤焦點
- 每次操作跳 toast 回饋，例如「已快轉 10 分鐘，觸發 3 個事件」

### 9.2 功能區塊

| 區塊 | 內容 |
|---|---|
| **時間** | `+1 分` `+10 分` `+1 小時` `+1 天`／速度 `1x` `10x` `60x` `暫停`／顯示當前虛擬時間／`回到真實時間` |
| **模擬出價** | 選車商（含 4 家不可登入的）→ 選拍賣（預設當前頁那筆）→ `加一級距` 或自訂金額；勾選「連續隨機出價」則每 3 秒隨機一家車商加價一次 |
| **強制狀態** | 立即開標／立即結標／強制流標／強制進入議價／強制撤標（自動填入理由「Demo 控制台觸發」，不彈填寫視窗） |
| **推送通知** | 選通知類型 + 收件者 → 立即送出（不必等事件真的發生） |
| **場景** | 一鍵切換角色／載入預設情境／`重置為初始資料` |

### 9.3 預設情境

按一顆按鈕把資料調成某個畫面，示範時不必手動鋪陳：

| 情境 | 效果 |
|---|---|
| 即將結標的熱門車 | 剩 2 分鐘、已有 8 次出價、當前車商領先 |
| 你被超越了 | 剛被另一家車商超越，OUTBID 通知已在鈴鐺裡 |
| 軟結標延長中 | 已延長 3 次，倒數旁顯示「已延長 9 分鐘」 |
| 議價中 | 最高 ¥780,000 vs 底價 ¥820,000，議價邀請已發出 |
| 密封投標開標前 | 3 家已投標，金額全部隱藏 |
| 代理出價互頂 | 兩家車商都設了代理，價格自動跳到其中一方上限 |

載入情境會覆蓋當前狀態，執行前彈確認。

---

## 10. 假資料生成

`faker.seed(20260728)` 固定種子，重置後資料完全相同。

| 資料 | 來源 |
|---|---|
| 廠牌／車型 | **自行維護的日本車款清單**（faker 的 `vehicle.model()` 會產出歐美車款，不適用） |
| VIN | `faker.vehicle.vin()` |
| 車牌 | 自訂日本車牌格式（如 `品川 330 あ 12-34`） |
| 顏色 | 自訂色彩清單（對應車型分類） |
| 車商公司名、負責人 | 自訂日式公司名清單 + `faker.person.fullName()` |
| 里程、排氣量、價格 | `faker.number.int()`，依車型設定合理區間 |
| 備註 | 自訂車況描述句庫抽樣 |

**車款清單**（每廠牌 2–5 款）：Toyota（Alphard、Prius、Hiace、Corolla Fielder、Land Cruiser Prado）· Nissan（Serena、Note、X-Trail、Elgrand）· Honda（N-BOX、Fit、Freed、Vezel）· Mazda（CX-5、Demio）· Subaru（Forester、Impreza）· Suzuki（Jimny、Wagon R）· Mitsubishi（Delica D:5）· Lexus（RX、IS）

**照片**

```
https://loremflickr.com/640/480/car?lock=<由 faker seed 決定的固定數字>
```

`lock` 固定，所以同一台車永遠是同一張圖。

⚠️ `faker.image.urlLoremFlickr()` 自 v10.1.0 起 deprecated（v11 移除），因此**自行組 URL**，不呼叫該 helper。

**離線 fallback**：`<VehiclePhoto>` 元件在 `onError` 時改用 `faker.image.dataUri()`（純本地 SVG），並在整個 session 記住「外部圖片不可用」，後續直接走 fallback，不再重試。

**初始資料量**

- 12 台在庫車輛（未排拍）
- 14 筆拍賣，涵蓋三種方式與六種狀態：3 未開始、5 進行中（含 1 即將結標、1 已延長）、2 議價中、2 已流標、2 已成交
- 6 家車商（2 家可登入）
- 各進行中拍賣預先塞 0–12 筆歷史出價
- 3 筆預設代理出價

---

## 11. 視覺設計方向

參照日系車拍平台（USS／TAA）的高密度工具感，不做鬆散的行銷風。

- 深色頂欄（`slate-900`）+ 淺灰工作區（`slate-50`）+ 白卡片
- 所有金額使用 `tabular-nums` 等寬數字，`¥1,820,000` 格式
- 狀態色票：未開始 slate · 進行中 emerald · 議價中 amber · 已流標 rose · 已成交 blue · 已撤標 slate + 刪除線
- 倒數計時 < 5 分鐘轉紅並輕微脈動；已延長時在倒數旁加 `已延長` 標記
- 評級徽章沿用日本車拍的視覺慣例（數字 + 內裝字母，如 `4.5 / B`）
- 底價相關資訊一律加上鎖頭 icon 與「內部」底色，避免示範時誤解為車商看得到

實作時以 `frontend-design` skill 定調細節（字體、強調色、間距節奏）。

---

## 12. 測試策略

只對 `src/engine/` 做 TDD。頁面不寫測試，靠實際點擊驗證。

**測試案例清單**

*級距（`rules.test.ts`）*

1. 各價格區間回傳正確自動級距（邊界值 499,999／500,000／1,999,999／2,000,000）
2. `stepMode: 'fixed'` 忽略價格一律回傳 `fixedStep`
3. 無人出價時合法出價 = 起標價
4. 低於合法出價、非級距整數倍的金額被拒

*軟結標*

5. 結標前 3 分鐘內出價 → `endAt` 往後 3 分鐘、`extendedMs` 累加
6. 結標前 4 分鐘出價 → 不延長
7. 累計延長達 60 分鐘上限後不再延長
8. 即時同步拍用 15 秒窗口
9. 密封投標不延長

*代理出價（`proxy.test.ts`）*

10. 代理只出「打敗目前最高價所需的最小金額」
11. 手動出價低於他人代理上限 → 代理自動反超
12. 兩方代理互頂 → 價格停在較低上限 +1 級距，較高上限者領先
13. 代理上限相同 → 較早設定者以該金額領先
14. 上限用盡 → `active = false` 並發 OUTBID

*結標判定（`advance.test.ts`）*

15. 無出價 → 已流標（無人出價）
16. 最高價 ≥ 底價 → 已成交
17. 差距 9% → 議價中，`negotiation` 內容正確
18. 差距 11% → 已流標（未達底價）
19. 議價期限到且有次高出價者 → 換人詢問、`declinedDealerIds` 累加
20. 議價期限到且無次高者 → 已流標（議價失敗）
21. 密封標收到 ≥ 立即成交價的投標 → 立刻成交，不等 `endAt`

*冪等性與通知*

22. 同一 `now` 重複呼叫 `advanceAuctions` → 狀態與事件皆相同
23. 從開標前一次快轉到結標後 → 狀態正確，且 `ENDING_SOON` 只發一次
24. 撤標 → 所有出價者與關注者各收到一則 WITHDRAWN

---

## 13. 檔案結構

```
src/
  main.tsx
  App.tsx
  router.tsx
  types.ts
  lib/
    money.ts          formatJPY、bidStepFor、nextValidBid
    time.ts           formatDuration、formatDateTime
    cn.ts
  engine/
    clock.ts          虛擬時鐘
    rules.ts          級距、軟結標、結標判定（純函式）
    proxy.ts          代理出價解析
    advance.ts        advanceAuctions(state, now) → { state, events }
    notify.ts         事件 → 通知
    *.test.ts
  store/
    index.ts          zustand + persist
    slices/           auth · garage · auctions · notifications · demo
  data/
    seed.ts
    vehicleCatalog.ts 日本車款清單
    images.ts         照片 URL + fallback
    dealers.ts
    scenarios.ts      預設情境
  components/
    ui/               shadcn 元件
    layout/           TopBar · SideNav · AppShell
    vehicle/          VehicleCard · VehiclePhoto · GradeBadge · SpecTable
    auction/          AuctionCard · StatusBadge · Countdown · BidPanel
                      ProxyBidDialog · BidHistory · ReservePriceHint
    notifications/    NotificationBell · NotificationList · Toaster
    demo/             DemoConsole · TimeControls · BidSimulator
                      ForceStateControls · NotificationPusher · ScenarioPicker
  pages/
    Login.tsx
    admin/            GarageList · GarageEdit · AuctionList · AuctionEdit · AuctionMonitor
    dealer/           AuctionList · AuctionDetail · Watchlist · Notifications
```

---

## 14. 已知取捨

| 決定 | 取捨 |
|---|---|
| 即時同步拍做成單車 90 秒窗口，不做多車場次隊列 | 少了場次感，但足以展示機制差異，省下大量狀態管理 |
| 密封投標不支援代理出價 | 符合密封標「只投一次」的性質 |
| 照片走外部服務 + 離線 fallback | 有真車照，代價是無網路時退化為抽象 SVG |
| 車商端不做保證金／額度 | 與拍賣主線關聯較弱，可後續補 |
| 頁面不寫測試 | Demo 生命週期短，投報率低；引擎有測試守住規則 |
| 不做手機版精修 | 上游提案 5.2 標註「行動優先」為正式產品要求，Demo 階段先確保桌機示範品質 |

---

**文件結束**
