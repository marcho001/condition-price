export type Role = 'staff' | 'dealer'

/** Phase 1 的三個內部角色。dealer 沒有這個欄位。 */
export type StaffRole = 'registrar' | 'operator' | 'admin'

export type User = {
  id: string
  role: Role
  staffRole?: StaffRole
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

/** 流標後的非拍賣處置路徑（Phase 1 §4.4） */
export type Disposition = '待整備' | '固定價格掛售' | '整批出清'

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
  /** 上架前檢核用：行照、保養紀錄、驗車紀錄等文件是否到齊 */
  documentsReady: boolean
  /** 這台車已經重新上架幾次，用來擋掉無限降價重掛 */
  relistCount: number
  disposition?: Disposition
  createdAt: number
}

export type AuctionType = 'SCHEDULED' | 'SEALED'
export type AuctionStatus = '未開始' | '進行中' | '議價中' | '已流標' | '已成交'
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
  /** 底價已經過核准。上架前檢核清單的其中一項。 */
  reserveApproved: boolean
  stepMode: StepMode
  fixedStep?: number
  buyNowPrice?: number
  extendedMs: number
  closeReason?: CloseReason
  deal?: Deal
  negotiation?: Negotiation
  /** 這筆拍賣是從哪一筆流標的拍賣重掛出來的 */
  relistedFromId?: string
  emittedKeys: string[]
  createdAt: number
}

export type Bid = {
  id: string
  auctionId: string
  dealerId: string
  amount: number
  at: number
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
  | 'NO_BID_ALERT'
  | 'ENDING_BELOW_RESERVE'
  | 'AUCTION_CLOSED'

/**
 * 刻意不叫 Notification，避免與瀏覽器內建的全域 Notification 型別衝突。
 */
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
  watches: Watch[]
}
