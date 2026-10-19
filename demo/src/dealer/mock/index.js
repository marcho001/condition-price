// Demo 用 mock：以 axios adapter 攔截請求，依「METHOD 路徑」對應到下方 handler。
// 與正式站的差別只在資料來源 —— 一律向兩站共用的拍賣核心（src/shared/engine.js）取資料，
// 內部系統的操作（排定、加價、指定成交、停用…）會即時反映到這裡。
// 回傳格式依知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml
// 與 API/auction-award/auction-award-dealer-site.yaml；車輛資料一律不帶 OrderNo。
import dayjs from 'dayjs'
import { QUICK_FILTER, ROUND_TYPE } from '@/api/auction'
import { CODE } from '@/api/codes'
import { NOTICE_TYPE as API_NOTICE_TYPE } from '@/api/notice'
import { db, serverNow } from '../../shared/store.js'
import { MAKES, NOTICE_TYPE } from '../../shared/constants.js'
import * as engine from '../../shared/engine.js'
import { dealerOfToken, tokenOf } from '@/demo/token'

const MOCK_DELAY_MS = 150
const PAGE_SIZE_MAX = 50
const DATE_TIME = 'YYYY-MM-DD HH:mm:ss'

// 與後端相同的錯誤訊息，前端直接以 toast 顯示
const MESSAGE_BY_CODE = {
  [CODE.PARAM_ERROR]: '入力内容に誤りがあります。',
  [CODE.LOGIN_FAILED]: 'Email またはパスワードが正しくありません。',
  [CODE.LOGIN_LOCKED_NOW]: 'ログインに 5 回失敗したため、アカウントをロックしました。担当者までご連絡ください。',
  [CODE.LOGIN_LOCKED]: 'アカウントがロックされています。担当者までご連絡ください。',
  [CODE.LOGIN_DISABLED]: 'このアカウントは現在ご利用いただけません。担当者までご連絡ください。',
  [CODE.NOT_LOGGED_IN]: 'ログインの有効期限が切れました。再度ログインしてください。',
  [CODE.AUCTION_NOT_FOUND]: 'このオークションは終了したか、閲覧できません。',
  [CODE.BID_NOT_ELIGIBLE]: 'このオークションに入札する資格がありません。',
  [CODE.BID_CLOSED]: '締切を過ぎているため入札できません。',
  [CODE.BID_BELOW_FIRST_FLOOR]: '1 円以上の金額を入力してください。',
  [CODE.BID_BELOW_EXTRA_FLOOR]: '開始価格を上回る金額を入力してください。',
  [CODE.BID_NOT_EXIST]: '取り消す入札がありません。',
}

// 除了登入、登出，其餘 API 都要帶有效的 token
const PUBLIC_PATHS = ['/auction/dealer/auth/login', '/auction/dealer/auth/logout']

const ok = (data = null) => ({ code: CODE.SUCCESS, message: 'success', data })
const fail = (code, message = MESSAGE_BY_CODE[code] ?? '') => ({ code, message, data: null })

// ---- 錯誤對應：engine 的錯誤 → 後端業務碼 ----
const LOGIN_ERROR = {
  BAD_CREDENTIAL: CODE.LOGIN_FAILED,
  LOCKED_NOW: CODE.LOGIN_LOCKED_NOW,
  LOCKED: CODE.LOGIN_LOCKED,
  DISABLED: CODE.LOGIN_DISABLED,
}

// 出價：不存在、開始日未到、未受邀一律 1402（API 說明）
const BID_ERROR = {
  NOT_FOUND: CODE.BID_NOT_ELIGIBLE,
  NOT_ELIGIBLE: CODE.BID_NOT_ELIGIBLE,
  CLOSED: CODE.BID_CLOSED,
  INVALID: CODE.PARAM_ERROR,
  BELOW_FIRST_FLOOR: CODE.BID_BELOW_FIRST_FLOOR,
  BELOW_EXTRA_FLOOR: CODE.BID_BELOW_EXTRA_FLOOR,
  NO_BID: CODE.BID_NOT_EXIST,
}

// 站內通知類型：engine 存字串，API 回 1–5
const NOTIFY_TYPE = {
  [NOTICE_TYPE.NEW_AUCTION]: API_NOTICE_TYPE.LISTED,
  [NOTICE_TYPE.EXTRA_ROUND_INVITE]: API_NOTICE_TYPE.EXTRA_ROUND,
  [NOTICE_TYPE.CLOSING_SOON]: API_NOTICE_TYPE.DEADLINE,
  [NOTICE_TYPE.WON]: API_NOTICE_TYPE.WON,
  [NOTICE_TYPE.LOST]: API_NOTICE_TYPE.LOST,
}

const routes = {
  'POST /auction/dealer/auth/login': ({ email, password }) => {
    if (!email || !password) return fail(CODE.PARAM_ERROR)
    const result = engine.dealerLogin(email, password)
    if (!result.ok) return fail(LOGIN_ERROR[result.error] ?? CODE.LOGIN_FAILED)
    return ok({ token: tokenOf(result.dealer), dealerName: result.dealer.name })
  },

  // token 已失效時同樣回成功
  'POST /auction/dealer/auth/logout': () => ok(),

  'POST /auction/dealer/auction/list': (params, dealer) => {
    const all = openAuctions(dealer.id).filter((a) => matchFilters(a.vehicle, params) && matchQuickFilter(a.round, params.quickFilter))
    return ok(paginate(all.map((a) => toCard(a, dealer.id)), params))
  },

  'POST /auction/dealer/auction/my/list': (params, dealer) => {
    const all = openAuctions(dealer.id)
      .filter((a) => engine.bidOf(a.round.id, dealer.id))
      .filter((a) => matchFilters(a.vehicle, params) && matchQuickFilter(a.round, params.quickFilter))
    return ok(paginate(all.map((a) => toCard(a, dealer.id)), params))
  },

  // 已得標：得標時間由近到遠（engine 已排序），不吃 quickFilter
  'POST /auction/dealer/auction/won/list': (params, dealer) => {
    const all = engine.dealerWonList(dealer.id).filter((w) => matchFilters(w.vehicle, params))
    return ok(paginate(all.map(toWonCard), params))
  },

  'POST /auction/dealer/common/getMakes': () => ok(MAKES.map(({ makeId, makeName }) => ({ makeId, makeName }))),

  // engine 的顏色、燃料、用途直接存顯示名，因此回「名稱 → 名稱」的對照，畫面照常顯示名稱
  'POST /auction/dealer/common/getCarColor': () =>
    ok(distinctValues('color').map((name) => ({ colorId: name, colorName: name }))),

  // 不存在的分類不回 key（與 API 說明一致）
  'POST /auction/dealer/common/getDict': ({ dictKey }) => {
    if (!Array.isArray(dictKey) || !dictKey.length) return fail(CODE.PARAM_ERROR)
    const known = ['fuelType', 'vehicleUsageType']
    return ok(
      Object.fromEntries(
        dictKey
          .filter((key) => known.includes(key))
          .map((key) => [key, distinctValues(key).map((name) => ({ dictKey: name, dictValue: name }))]),
      ),
    )
  },

  'POST /auction/dealer/auction/detail': ({ roundId }, dealer) => {
    const round = engine.roundById(roundId)
    const vehicle = round && engine.vehicleById(round.vehicleId)
    if (!vehicle || !engine.canDealerSeeRound(roundId, dealer.id) || vehicle.status !== 'IN_AUCTION')
      return fail(CODE.AUCTION_NOT_FOUND)
    return ok(toDetail({ round, vehicle }, dealer.id))
  },

  // 他家得標、已結清：1401
  'POST /auction/dealer/auction/won/detail': ({ roundId }, dealer) => {
    const won = engine.dealerWonList(dealer.id).find((w) => w.award.roundId === roundId)
    if (!won) return fail(CODE.AUCTION_NOT_FOUND)
    const { award, vehicle } = won
    return ok({
      roundId: award.roundId,
      dealPrice: award.amount,
      dealDate: dayjs(award.at).format('YYYY-MM-DD'),
      vehicle: toPublicVehicle(vehicle),
      remark: engine.vehicleView(vehicle).remark || null,
      attachments: toAttachments(vehicle),
    })
  },

  'POST /auction/dealer/bid/submit': ({ roundId, amount }, dealer) => {
    if (!roundId || !Number.isInteger(amount) || amount < 0) return fail(CODE.PARAM_ERROR)
    const result = engine.placeBid(roundId, dealer.id, amount)
    if (!result.ok) return fail(BID_ERROR[result.error] ?? CODE.SYSTEM_ERROR)
    return ok({ amount: result.amount, bidTime: dayjs(result.at).format(DATE_TIME) })
  },

  'POST /auction/dealer/bid/cancel': ({ roundId }, dealer) => {
    if (!roundId) return fail(CODE.PARAM_ERROR)
    const result = engine.cancelBid(roundId, dealer.id)
    return result.ok ? ok() : fail(BID_ERROR[result.error] ?? CODE.SYSTEM_ERROR)
  },

  'POST /auction/dealer/notification/list': ({ notifyType, keyword, ...page }, dealer) => {
    const kw = keyword?.trim().toLowerCase()
    const list = engine
      .notificationsOf(dealer.id)
      .map(toNotice)
      .filter((n) => !notifyType || n.notifyType === notifyType)
      .filter((n) => !kw || `${n.title}${n.content}`.toLowerCase().includes(kw))
    return ok(paginate(list, page))
  },

  'POST /auction/dealer/notification/unread-count': (_, dealer) => ok({ unreadCount: engine.unreadCountOf(dealer.id) }),

  // 不存在或已讀的 id 直接略過
  'POST /auction/dealer/notification/read': ({ ids }, dealer) => {
    if (!validIds(ids)) return fail(CODE.PARAM_ERROR)
    engine.markNoticesRead(ids, dealer.id)
    return ok()
  },

  'POST /auction/dealer/notification/delete': ({ ids }, dealer) => {
    if (!validIds(ids)) return fail(CODE.PARAM_ERROR)
    engine.deleteNotices(ids, dealer.id)
    return ok()
  },
}

// ---- 列表查詢用的小工具 ----

const validIds = (ids) => Array.isArray(ids) && ids.length >= 1 && ids.length <= 100

/** 投標中、該廠商本輪有資格的拍賣（剩餘時間最短優先，engine 已排序） */
function openAuctions(dealerId) {
  return engine.dealerOpenAuctions(dealerId)
}

/** 全部車輛（含進件資料）中某欄位出現過的值，做為字典／顏色選項 */
function distinctValues(key) {
  const values = db.vehicles.map((v) => engine.vehicleView(v)[key])
  return [...new Set(values.filter((v) => v !== undefined && v !== null && v !== ''))]
}

const toNumberOrNull = (value) => (value === undefined || value === null || value === '' ? null : Number(value))

function matchFilters(vehicle, { vin, makeIds, carYearFrom, carYearTo, mileageFrom, mileageTo }) {
  const view = engine.vehicleView(vehicle)
  // 車台番号：部分比對、不分大小寫；比對前正規化全形／半形
  const normalize = (value) => String(value ?? '').normalize('NFKC').trim().toLowerCase()

  if (vin && !normalize(view.vin).includes(normalize(vin))) return false
  if (makeIds?.length && !makeIds.includes(view.makeId)) return false
  // 年式：含兩端；未登錄年式的車輛在設定年式條件時不列出
  if (carYearFrom || carYearTo) {
    const carYear = toNumberOrNull(view.carYear)
    if (carYear == null || Number.isNaN(carYear)) return false
    if (carYearFrom && carYear < carYearFrom) return false
    if (carYearTo && carYear > carYearTo) return false
  }
  // 走行距離：含兩端
  const mileage = toNumberOrNull(view.mileage)
  if (mileageFrom != null && (mileage == null || mileage < mileageFrom)) return false
  if (mileageTo != null && (mileage == null || mileage > mileageTo)) return false
  return true
}

// 「近兩日」含今日共兩天，日期一律以伺服器時間（JST）判定（規格 5.2）
function matchQuickFilter(round, quickFilter) {
  const today = dayjs(engine.serverToday())
  const isOn = (date, ...dayOffsets) => dayOffsets.some((d) => dayjs(date).isSame(today.add(d, 'day'), 'day'))
  if (quickFilter === QUICK_FILTER.NEW) return isOn(round.startDate, 0, -1)
  if (quickFilter === QUICK_FILTER.ENDING_SOON) return isOn(round.endDate, 0, 1)
  return true
}

function paginate(list, { pageNo = 1, pageSize = 20 }) {
  const size = Math.min(pageSize, PAGE_SIZE_MAX)
  const start = (pageNo - 1) * size
  return { total: list.length, pageNo, pageSize: size, records: list.slice(start, start + size) }
}

// ---- 回傳格式 ----

/** 對外站可見的車輛欄位（不含 OrderNo、備考、makeId） */
function toPublicVehicle(vehicle) {
  const v = engine.vehicleView(vehicle)
  return {
    makeName: v.makeName,
    seriesName: v.seriesName,
    yearName: v.yearName ?? null,
    modelName: v.modelName ?? null,
    carYear: toNumberOrNull(v.carYear),
    color: v.color ?? null,
    fuelType: v.fuelType ?? null,
    displacement: v.displacement ?? null,
    vin: v.vin || null,
    licensingPlateNumber: v.licensingPlateNumber ?? null,
    productDate: v.productDate || null,
    registeDate: v.registeDate || null,
    vehicleUsageType: v.vehicleUsageType ?? null,
    transferCount: v.transferCount ?? null,
    mileage: toNumberOrNull(v.mileage),
  }
}

/** 附件依上傳順序：照片（jpg／png）與其他附件（pdf）混在同一個陣列 */
function toAttachments(vehicle) {
  return (vehicle.attachments || []).map((att) => ({ fileName: att.name, fileUrl: engine.attachmentUrl(att, vehicle) }))
}

const PHOTO_PATTERN = /\.(jpe?g|png)$/i
const coverUrlOf = (attachments) => attachments.find((f) => PHOTO_PATTERN.test(f.fileName))?.fileUrl ?? null

/** 輪次的共用欄位：首輪不揭露起標價；截止時刻為結束日當日結束（engine 定義） */
function roundFields(round) {
  const isExtra = round.round > 1
  return {
    roundId: round.id,
    roundType: isExtra ? ROUND_TYPE.EXTRA : ROUND_TYPE.FIRST,
    startDate: round.startDate,
    endDate: round.endDate,
    endAt: dayjs(engine.roundEndAt(round)).format(),
    startPrice: isExtra ? round.startPrice : null,
  }
}

function myBidOf(round, dealerId) {
  const bid = engine.bidOf(round.id, dealerId)
  return bid ? { amount: bid.amount, bidTime: dayjs(bid.at).format(DATE_TIME) } : null
}

// 列表卡片（AuctionCard）：車輛欄位攤平，封面為最早上傳的一張圖片
function toCard({ round, vehicle }, dealerId) {
  const { makeName, seriesName, licensingPlateNumber, carYear, mileage, color, vin } = toPublicVehicle(vehicle)
  return {
    ...roundFields(round),
    makeName, seriesName, licensingPlateNumber, carYear, mileage, color, vin,
    myBidAmount: myBidOf(round, dealerId)?.amount ?? null,
    coverUrl: coverUrlOf(toAttachments(vehicle)),
  }
}

// 投標中詳細
function toDetail({ round, vehicle }, dealerId) {
  return {
    ...roundFields(round),
    myBid: myBidOf(round, dealerId),
    vehicle: toPublicVehicle(vehicle),
    remark: engine.vehicleView(vehicle).remark || null,
    attachments: toAttachments(vehicle),
  }
}

// 已得標卡片（WonCard）
function toWonCard({ award, vehicle }) {
  const { makeName, seriesName, licensingPlateNumber, carYear, mileage, color, vin } = toPublicVehicle(vehicle)
  return {
    roundId: award.roundId,
    makeName, seriesName, licensingPlateNumber, carYear, mileage, color, vin,
    dealPrice: award.amount,
    dealDate: dayjs(award.at).format('YYYY-MM-DD'),
    coverUrl: coverUrlOf(toAttachments(vehicle)),
  }
}

function toNotice(n) {
  return {
    id: n.id,
    notifyType: NOTIFY_TYPE[n.type],
    title: n.title,
    content: n.content,
    readFlag: n.read ? 1 : 0,
    createTime: dayjs(n.at).format(DATE_TIME),
  }
}

// ---- axios adapter ----

export async function mockAdapter(config) {
  const method = config.method.toUpperCase()
  const path = config.url.split('?')[0]
  const handler = routes[`${method} ${path}`]
  const params = method === 'GET' ? config.params : JSON.parse(config.data || '{}')

  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

  // 每次請求前先跑一次排程（開始、通知、催投、結標），確保回傳的是伺服器時間當下的狀態
  engine.runScheduler()

  let body
  if (!handler) {
    body = fail(CODE.SYSTEM_ERROR, `mock 尚未實作：${method} ${path}`)
  } else if (PUBLIC_PATHS.includes(path)) {
    body = handler(params ?? {})
  } else {
    const dealer = dealerOfToken(config.headers.token)
    body = dealer ? handler(params ?? {}, dealer) : fail(CODE.NOT_LOGGED_IN)
  }
  // 深拷貝，避免頁面直接改到共用資料
  return {
    data: JSON.parse(JSON.stringify(body)),
    status: 200,
    statusText: 'OK',
    headers: { date: new Date(serverNow.value).toUTCString() },
    config,
    request: {},
  }
}
