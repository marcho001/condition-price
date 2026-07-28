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
  proxies: ProxyBid[]
  watches: Watch[]
}
