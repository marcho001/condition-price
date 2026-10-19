// 車輛資料欄位定義 —— 對應內部系統規格 4.3（V3.1 起移除「次回車検日」「自賠責保険の有効期限」）
// editable: 收車後可編輯（會隨車輛被繼續使用而改變的欄位）
// external: 是否於對外站呈現
export const VEHICLE_FIELDS = [
  { key: 'makeName', ja: 'メーカー', zh: '制造商', editable: false, external: true },
  { key: 'seriesName', ja: '車系', zh: '车系', editable: false, external: true },
  { key: 'yearName', ja: 'モデル', zh: '车型', editable: false, external: true },
  { key: 'modelName', ja: 'グレード', zh: '车款', editable: false, external: true },
  { key: 'carYear', ja: '年式', zh: '生产年份', editable: false, external: true },
  { key: 'color', ja: 'ボディカラー', zh: '车身颜色', editable: false, external: true },
  { key: 'fuelType', ja: '燃料の種類', zh: '燃料类型', editable: false, external: true },
  { key: 'displacement', ja: '総排気量または定格出力', zh: '排量', editable: false, external: true },
  { key: 'mileage', ja: '走行距離', zh: '公里数', editable: true, external: true, type: 'mileage' },
  { key: 'vin', ja: '車台番号', zh: 'VIN', editable: false, external: true },
  { key: 'licensingPlateNumber', ja: 'ナンバープレート', zh: '车牌号码', editable: false, external: true },
  { key: 'productDate', ja: '登録年月日/交付年月日', zh: '出厂日期', editable: false, external: true, type: 'date' },
  { key: 'registeDate', ja: '初度登録年月', zh: '初登日期', editable: false, external: true, type: 'month' },
  { key: 'vehicleUsageType', ja: '自家用・事業用の別', zh: '自用・营业用性质', editable: false, external: true },
  { key: 'transferCount', ja: '車両の移転回数', zh: '车辆过户次数', editable: false, external: true },
  { key: 'remark', ja: '備考', zh: '备注', editable: true, external: true, type: 'textarea', full: true }
]

export const EDITABLE_KEYS = VEHICLE_FIELDS.filter((f) => f.editable).map((f) => f.key)

export const REMARK_MAX_LENGTH = 300

// 車輛狀態（對應 portal 的 auctionStatus：10/15/20/30/40/50）
export const VEHICLE_STATUS = {
  PENDING_SCHEDULE: 'PENDING_SCHEDULE', // 待排定拍賣（車輛管理）
  NOT_STARTED: 'NOT_STARTED', // 待開始（已排定、開始日未到）
  IN_AUCTION: 'IN_AUCTION', // 投標中
  CLOSED: 'CLOSED', // 已結標
  AWARDED: 'AWARDED', // 已決標
  SETTLED: 'SETTLED' // 已結清（貸後結清通知後軟刪除，不在任何列表呈現）
}

// 每一輪的狀態
export const ROUND_STATUS = {
  PENDING: 'PENDING', // 待開始：對外站完全不呈現、不發通知
  OPEN: 'OPEN', // 投標中
  CLOSED: 'CLOSED', // 已結標
  CANCELLED: 'CANCELLED' // 取消排定而作廢：不佔輪次序號，僅留存於稽核
}

// 拍賣通知（事件 1〜5）—— Email + SMS + 對外站站內通知，三者同時發送。
// 通知類型於發送當下寫入該筆通知（對外站 API 的 notifyType 1〜5）
export const NOTICE_TYPE = {
  NEW_AUCTION: 'NEW_AUCTION', // 1 上架通知
  EXTRA_ROUND_INVITE: 'EXTRA_ROUND_INVITE', // 2 加價拍賣通知
  CLOSING_SOON: 'CLOSING_SOON', // 3 拍賣即將到期通知
  WON: 'WON', // 4 得標通知
  LOST: 'LOST' // 5 未得標通知
}

// 帳號通知（事件 6、7）—— 僅 Email，不發 SMS、不進站內通知
export const EMAIL_TYPE = {
  ACCOUNT_ISSUED: 'ACCOUNT_ISSUED',
  PASSWORD_RESET: 'PASSWORD_RESET'
}

// 輪次類型 —— 列表與篩選一律只用這兩個值，不顯示第幾輪
export const ROUND_TYPE = {
  FIRST: 'FIRST',
  EXTRA: 'EXTRA'
}

export const roundTypeOf = (round) => (round && round.round > 1 ? ROUND_TYPE.EXTRA : ROUND_TYPE.FIRST)

// 權限點 —— 規格第三章。財務人員不可用的六項各對應一個權限點，全部只授予催收人員
export const PERMISSION = {
  CLOSED_TAB: 'auction:closed-tab',
  AWARDED_DETAIL: 'auction:awarded-detail',
  CANCEL_SCHEDULE: 'auction:cancel-schedule',
  URGE: 'auction:urge',
  DESIGNATE: 'auction:designate',
  ADDITIONAL_ROUND: 'auction:additional-round'
}

// 角色 —— 催收人員擁有完整功能；財務人員為受限角色（V3.1 更正）
export const ROLE = {
  COLLECTION: 'collection', // 催收人員
  FINANCE: 'finance' // 財務人員
}

export const ROLE_PERMISSIONS = {
  [ROLE.COLLECTION]: Object.values(PERMISSION),
  [ROLE.FINANCE]: []
}

// 列表每頁筆數 —— 本模組全部有分頁的列表一致（規格七、7.2）
export const PAGE_SIZES = [25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25

// 廠牌主檔 —— 對外站的廠牌篩選以唯一值 makeId 傳遞與比對（對外規格 5.2）
export const MAKES = [
  'トヨタ', 'レクサス', '日産', 'ホンダ', 'マツダ', 'スバル', 'スズキ', 'ダイハツ', '三菱', 'BMW', 'メルセデス・ベンツ'
].map((makeName, i) => ({ makeId: String(101 + i), makeName }))

export const makeIdOf = (makeName) => MAKES.find((m) => m.makeName === makeName)?.makeId ?? null

export const COLORS_JA = ['パールホワイト', 'ブラック', 'シルバー', 'ガンメタリック', 'ダークブルー', 'レッド', 'ベージュ']
export const FUEL_JA = ['ガソリン', 'ハイブリッド', 'ディーゼル']
