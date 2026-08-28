// 車輛資料欄位定義 —— 對應內部系統規格 4.3
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
  { key: 'vehicleInspectionTime', ja: '次回車検日', zh: '车检日期', editable: true, external: true, type: 'date' },
  { key: 'vehicleUsageType', ja: '自家用・事業用の別', zh: '自用・营业用性质', editable: false, external: true },
  { key: 'transferCount', ja: '車両の移転回数', zh: '车辆过户次数', editable: false, external: true },
  { key: 'trafficInsuranceExpiryDate', ja: '自賠責保険の有効期限', zh: '交强险失效日', editable: true, external: true, type: 'date' },
  { key: 'remark', ja: '備考', zh: '備註', editable: true, external: true, type: 'textarea', full: true }
]

// 內部參考價 —— 一律不對廠商揭露（規格 6.1 / 實作筆記 6.1 注意事項 2）
export const INTERNAL_ONLY_FIELDS = [
  { key: 'guidePrice', ja: '車両価格範囲', zh: '车辆价格范围' },
  { key: 'valuationPrice', ja: '車両評価', zh: '车辆估值' }
]

export const EDITABLE_KEYS = VEHICLE_FIELDS.filter((f) => f.editable).map((f) => f.key)

// 附件分類 —— 白名單，未列於此者一律不顯示、不對外呈現（規格 4.4.1）
export const ATTACHMENT_CATEGORIES = {
  CAR_PHOTO: { ja: '車両写真', zh: '車輛照片' },
  CHECK_SHEET: { ja: '車両チェックシート', zh: '車輛檢查表' },
  METER: { ja: '走行距離メーター', zh: '里程表' },
  PART: { ja: '車両部位写真', zh: '車輛部位照片' },
  CONDITION: { ja: '引取後の現況写真', zh: '收車後現況照片' },
  RATING: { ja: '評価シート', zh: '評分表' },
  OTHER: { ja: 'その他', zh: '其他' }
}

export const VEHICLE_STATUS = {
  PENDING_SCHEDULE: 'PENDING_SCHEDULE', // 待排定拍賣
  IN_AUCTION: 'IN_AUCTION', // 拍賣進行中
  CLOSED: 'CLOSED', // 已結標
  AWARDED: 'AWARDED', // 已決標
  DONE: 'DONE' // 已完成（不在任何列表呈現）
}

export const AWARD_METHOD = {
  AWARD: 'AWARD', // 決標
  DESIGNATE: 'DESIGNATE' // 指定成交廠商
}

// 通知事件 —— 內部規格第八章 / 對外規格 8.2
export const NOTICE_TYPE = {
  NEW_AUCTION: 'NEW_AUCTION',
  EXTRA_ROUND_INVITE: 'EXTRA_ROUND_INVITE',
  CLOSING_SOON: 'CLOSING_SOON',
  WON: 'WON',
  LOST: 'LOST'
}

export const ROLE = {
  OPERATION: 'auction:operation', // 拍賣營運
  AWARD: 'auction:award' // 決標管理
}

export const COLORS_JA = ['パールホワイト', 'ブラック', 'シルバー', 'ガンメタリック', 'ダークブルー', 'レッド', 'ベージュ']
export const FUEL_JA = ['ガソリン', 'ハイブリッド', 'ディーゼル']
