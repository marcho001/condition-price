// Demo 用 mock：以 axios adapter 攔截內部系統的請求，依「METHOD 路徑」對應到下方 handler。
// 與正式站的差別只在資料來源 —— 一律向兩站共用的拍賣核心（src/shared/engine.js）取資料，
// 這裡的操作（排定、取消排定、催投、指定成交、加價、廠商維護…）會即時反映到對外站。
// 回傳格式依知識庫 API/*/*-portal.yaml：HTTP 一律 200，業務結果看 code（'0000' 成功）。
import dayjs from 'dayjs'
import { db } from '../../shared/store.js'
import * as engine from '../../shared/engine.js'
import { VEHICLE_STATUS, ROUND_STATUS, ROLE_PERMISSIONS, PAGE_SIZES } from '../../shared/constants.js'
import {
  AUCTION_STATUS,
  ROUND_TYPE,
  ENABLE_FLAG,
  LOCKED_FLAG,
  BIZ_CODE,
  PERMISSION_CODE,
  ATTACHMENT_EXT_LIST,
  ATTACHMENT_MAX_SIZE
} from '@common/constants'

const MOCK_DELAY_MS = 120
const DATE_TIME = 'YYYY-MM-DD HH:mm:ss'

// 文件未列入 BIZ_CODE 常數、但 API 會回的錯誤碼
const CODE = {
  ...BIZ_CODE,
  MILEAGE_CLEARED: '1208',
  SCHEDULE_DATE_INVALID: '1302',
  NO_ACTIVE_DEALER: '1303',
  NO_PERMISSION: '1304',
  INVITEE_INVALID: '1306',
  DEALER_NOT_DESIGNATABLE: '1502',
  NO_UNBID_DEALER: '1601'
}

// 後端依 Accept-Language 回傳訊息；內部 portal 只有中文、日文
const MESSAGES = {
  ja: {
    [CODE.PARAM_ERROR]: '入力内容に誤りがあります',
    [CODE.DEALER_EMAIL_DUPLICATED]: 'この Email は他の販売店で使用されています',
    [CODE.DEALER_NOT_FOUND]: '販売店が存在しません',
    [CODE.DEALER_NOT_LOCKED]: 'このアカウントはロックされていません',
    [CODE.VEHICLE_NOT_FOUND]: '車両が存在しません',
    [CODE.VEHICLE_SCHEDULED]: 'オークション登録済みの車両は編集できません',
    [CODE.ATTACHMENT_NOT_FOUND]: '添付ファイルが存在しません',
    [CODE.ATTACHMENT_INVALID]: '添付ファイルの形式またはサイズが正しくありません',
    [CODE.MILEAGE_CLEARED]: '走行距離は入力済みのため、空にできません',
    [CODE.SCHEDULE_VALIDATION_FAILED]: '選択した車両の一部が出品条件を満たしていません',
    [CODE.SCHEDULE_DATE_INVALID]: 'オークション期間が正しくありません',
    [CODE.NO_ACTIVE_DEALER]: '有効な販売店がないため、登録できません',
    [CODE.NO_PERMISSION]: 'この操作を行う権限がありません',
    [CODE.SCHEDULE_ALREADY_STARTED]:
      'このオークションは既に開始済み、または開始待ちではないため、取消できません',
    [CODE.INVITEE_INVALID]: '選択した販売店が存在しないか、無効になっています',
    [CODE.DEAL_NOTIFY_FAILED]: '成約通知に失敗しました。案件は締切済みのままです。時間をおいて再度お試しください',
    [CODE.DEALER_NOT_DESIGNATABLE]: 'この販売店は指定できません',
    [CODE.AUCTION_STATUS_CHANGED]: 'オークションの状態が変更されました',
    [CODE.NO_UNBID_DEALER]: 'このラウンドに未入札の販売店はありません',
    [CODE.SYSTEM_ERROR]: 'システムエラーが発生しました'
  },
  zhCn: {
    [CODE.PARAM_ERROR]: '参数异常',
    [CODE.DEALER_EMAIL_DUPLICATED]: '此 Email 已被其他厂商使用',
    [CODE.DEALER_NOT_FOUND]: '厂商不存在',
    [CODE.DEALER_NOT_LOCKED]: '该账号未锁定',
    [CODE.VEHICLE_NOT_FOUND]: '车辆不存在',
    [CODE.VEHICLE_SCHEDULED]: '车辆已排定拍卖，不可编辑',
    [CODE.ATTACHMENT_NOT_FOUND]: '附件不存在或不属于该车辆',
    [CODE.ATTACHMENT_INVALID]: '附件格式不支持或大小超过限制',
    [CODE.MILEAGE_CLEARED]: '走行距离已填写，不可清空',
    [CODE.SCHEDULE_VALIDATION_FAILED]: '有车辆不符合上架条件，整批未上架',
    [CODE.SCHEDULE_DATE_INVALID]: '拍卖日期不合法',
    [CODE.NO_ACTIVE_DEALER]: '没有启用中的厂商，无法排定',
    [CODE.NO_PERMISSION]: '无此操作权限',
    [CODE.SCHEDULE_ALREADY_STARTED]: '该轮已开始或已不是待开始，无法取消排定',
    [CODE.INVITEE_INVALID]: '勾选的厂商不存在或已停用',
    [CODE.DEAL_NOTIFY_FAILED]: '成交通知失败，订单仍在已结标，请稍后重试',
    [CODE.DEALER_NOT_DESIGNATABLE]: '此厂商不可指定',
    [CODE.AUCTION_STATUS_CHANGED]: '拍卖状态已变更',
    [CODE.NO_UNBID_DEALER]: '本轮没有未出价的厂商',
    [CODE.SYSTEM_ERROR]: '系统异常'
  }
}

// Demo 限制：上傳檔以 data URL 存進 localStorage，單檔過大會超出瀏覽器配額
const DEMO_MAX_STORED_CHARS = 2.5 * 1024 * 1024
const DEMO_MESSAGES = {
  ja: 'デモ環境ではブラウザの保存容量に限りがあるため、2MB を超える PDF はアップロードできません',
  zhCn: 'Demo 环境受浏览器存储容量限制，无法上传超过 2MB 的 PDF'
}

const lang = () => (sessionStorage.getItem('language') === 'zhCn' ? 'zhCn' : 'ja')

class BizError extends Error {
  constructor(code, data = null, message) {
    super(message || MESSAGES[lang()][code] || code)
    this.code = code
    this.data = data
  }
}

const ok = (data = null) => ({ code: CODE.SUCCESS, message: 'success', data })
const fail = (code, data = null) => {
  throw new BizError(code, data)
}

// ── 共用轉換 ──────────────────────────────────────────
const fmt = (ms) => (ms ? dayjs(ms).format(DATE_TIME) : null)
const operator = () => db.internalUser.name
const nil = (v) => (v === '' || v === undefined ? null : v)

/** 目前角色可用的權限碼（一個帳號可同時擁有兩個角色） */
export function currentPermissionCodes() {
  const roles = db.internalUser?.roles || []
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] || []))]
}
const requirePermission = (code) => {
  if (!currentPermissionCodes().includes(code)) fail(CODE.NO_PERMISSION)
}

const STATUS_CODE = {
  [VEHICLE_STATUS.PENDING_SCHEDULE]: AUCTION_STATUS.PENDING,
  [VEHICLE_STATUS.NOT_STARTED]: AUCTION_STATUS.NOT_STARTED,
  [VEHICLE_STATUS.IN_AUCTION]: AUCTION_STATUS.BIDDING,
  [VEHICLE_STATUS.CLOSED]: AUCTION_STATUS.CLOSED,
  [VEHICLE_STATUS.AWARDED]: AUCTION_STATUS.AWARDED,
  [VEHICLE_STATUS.SETTLED]: AUCTION_STATUS.SETTLED
}
const ROUND_STATUS_CODE = {
  [ROUND_STATUS.PENDING]: 10,
  [ROUND_STATUS.OPEN]: 20,
  [ROUND_STATUS.CLOSED]: 30
}
const roundTypeOf = (round) => (round && round.round > 1 ? ROUND_TYPE.ADDITIONAL : ROUND_TYPE.FIRST)

const getVehicle = (id) => engine.vehicleById(id) || fail(CODE.VEHICLE_NOT_FOUND)
const getDealer = (id) => engine.dealerById(id) || fail(CODE.DEALER_NOT_FOUND)

/** 顯示用車輛資料：收車現況值優先 */
function vehicleInfo(v) {
  const view = engine.vehicleView(v)
  return {
    makeName: nil(view.makeName),
    seriesName: nil(view.seriesName),
    yearName: nil(view.yearName),
    modelName: nil(view.modelName),
    carYear: nil(view.carYear),
    color: nil(view.color),
    fuelType: nil(view.fuelType),
    displacement: nil(view.displacement),
    mileage: nil(v.current?.mileage) === null ? null : Number(v.current.mileage),
    vin: nil(view.vin),
    licensingPlateNumber: nil(view.licensingPlateNumber),
    productDate: nil(view.productDate),
    registeDate: nil(view.registeDate),
    vehicleUsageType: nil(view.vehicleUsageType),
    transferCount: nil(view.transferCount),
    remark: nil(v.current?.remark)
  }
}

// 上傳的 pdf 存成 data URL；瀏覽器不允許以新分頁直接開 data URL，改給 blob URL
const blobUrlCache = new Map()
function previewUrl(att, v) {
  const url = engine.attachmentUrl(att, v)
  if (!att.dataUrl || !engine.isPdfAttachment(att)) return url
  if (!blobUrlCache.has(att.id)) {
    const [head, body] = att.dataUrl.split(',')
    const mime = head.match(/data:([^;]+)/)?.[1] || 'application/pdf'
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    blobUrlCache.set(att.id, URL.createObjectURL(new Blob([bytes], { type: mime })))
  }
  return blobUrlCache.get(att.id)
}

const attachmentOf = (att, v) => ({
  id: att.id,
  fileName: att.name,
  fileId: att.name,
  fileUrl: previewUrl(att, v),
  uploaderName: att.uploader || null,
  uploadTime: fmt(att.uploadedAt)
})

/** 列表共用的車輛欄位（AuctionVehicleBase） */
function auctionBase(v, round) {
  const info = vehicleInfo(v)
  return {
    vehicleId: v.id,
    orderNo: v.orderNo,
    makeName: info.makeName,
    seriesName: info.seriesName,
    licensingPlateNumber: info.licensingPlateNumber,
    carYear: info.carYear,
    mileage: info.mileage,
    color: info.color,
    roundType: roundTypeOf(round),
    startDate: round?.startDate ?? null,
    endDate: round?.endDate ?? null
  }
}

// ── 篩選與分頁 ────────────────────────────────────────
const includesKeyword = (value, keyword) =>
  !keyword || String(value ?? '').toLowerCase().includes(String(keyword).trim().toLowerCase())

function page(list, { pageNo = 1, pageSize = 25 } = {}) {
  if (!PAGE_SIZES.includes(Number(pageSize))) fail(CODE.PARAM_ERROR)
  const no = Math.max(1, Number(pageNo) || 1)
  const size = Number(pageSize)
  return {
    total: list.length,
    pageNo: no,
    pageSize: size,
    records: list.slice((no - 1) * size, no * size)
  }
}

/** 拍賣管理三個 tab 共用：orderNo／車牌／輪次類型／開始日區間 */
function filterAuctionRows(rows, body) {
  return rows.filter(({ vehicle, round }) => {
    const info = vehicleInfo(vehicle)
    if (!includesKeyword(vehicle.orderNo, body.orderNo)) return false
    if (!includesKeyword(info.licensingPlateNumber, body.licensingPlateNumber)) return false
    if (body.roundType && roundTypeOf(round) !== Number(body.roundType)) return false
    if (body.startDateFrom && round.startDate < body.startDateFrom) return false
    if (body.startDateTo && round.startDate > body.startDateTo) return false
    return true
  })
}

// ── 字典與顏色 ────────────────────────────────────────
// 拍賣核心存的是日文顯示名，字典以「代碼＝日文名」回傳；中文介面另給中文名
const DICT = {
  fuelType: [
    ['ガソリン', '汽油'],
    ['ハイブリッド', '油电混合'],
    ['ディーゼル', '柴油'],
    ['電気', '纯电']
  ],
  vehicleUsageType: [
    ['自家用', '自用'],
    ['事業用', '营业用']
  ]
}

function dictData(keys = []) {
  const out = {}
  keys.forEach((key) => {
    const base = Object.keys(DICT).find((k) => key === `${k}zh-CN` || key === `${k}ja-JP`)
    if (!base) return
    const zh = key.endsWith('zh-CN')
    out[key] = DICT[base].map(([code, zhName]) => ({ dictKey: code, dictValue: zh ? zhName : code }))
  })
  return out
}

function colorList() {
  const names = new Set()
  db.vehicles.forEach((v) => {
    const c = engine.vehicleView(v).color
    if (c) names.add(c)
  })
  return [...names].map((name) => ({ colorId: name, colorName: name }))
}

// ── 附件：讀檔、縮圖 ──────────────────────────────────
const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// 圖片縮至長邊 ≤ 1280px 的 JPEG 再存，避免超出 localStorage 配額
async function downscaleImage(file) {
  const src = await readAsDataUrl(file)
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = src
  })
  const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

const extOf = (name) => {
  const i = String(name || '').lastIndexOf('.')
  return i < 0 ? '' : String(name).slice(i + 1).toLowerCase()
}

// ── handler ──────────────────────────────────────────
const handlers = {
  // ── 共用 ──
  'POST /approve/web/common/getDict': (body) => ok(dictData(body?.dictKey)),
  'GET /service-manager/api/ucp/getCarColor': () => ok(colorList()),
  // 沿用 portal 權限機制：以「;」串接的權限碼；Demo 依右上角的角色切換計算
  'POST /auth-core/resource/getPageButton': () => ok(currentPermissionCodes().join(';')),

  // ── 車輛管理 ──
  'POST /auction/web/vehicle/list': (body) => {
    const list = engine
      .pendingVehicles()
      .filter((v) => {
        const info = vehicleInfo(v)
        if (!includesKeyword(v.orderNo, body.orderNo)) return false
        if (!includesKeyword(info.licensingPlateNumber, body.licensingPlateNumber)) return false
        if (body.receivedAtStart && v.receivedAt < body.receivedAtStart) return false
        if (body.receivedAtEnd && v.receivedAt > body.receivedAtEnd) return false
        return true
      })
      .map((v) => {
        const info = vehicleInfo(v)
        return {
          id: v.id,
          orderNo: v.orderNo,
          licensingPlateNumber: info.licensingPlateNumber,
          makeName: info.makeName,
          seriesName: info.seriesName,
          modelName: info.modelName,
          carYear: info.carYear,
          color: info.color,
          receivedAt: v.receivedAt,
          selectable: engine.canSchedule(v)
        }
      })
    return ok(page(list, body))
  },

  'POST /auction/web/vehicle/detail': (body) => {
    const v = getVehicle(body.id)
    // 拍賣資訊：已決標取成交輪，其餘取目前那一輪；待排定拍賣為 null
    let round = null
    if (v.status !== VEHICLE_STATUS.PENDING_SCHEDULE) {
      const award = engine.awardOf(v.id)
      round = award ? engine.roundById(award.roundId) : engine.latestRound(v.id)
    }
    return ok({
      id: v.id,
      orderNo: v.orderNo,
      auctionStatus: STATUS_CODE[v.status],
      editable: engine.isVehicleEditable(v),
      receivedAt: v.receivedAt,
      vehicle: vehicleInfo(v),
      attachments: v.attachments.map((att) => attachmentOf(att, v)),
      auctionInfo: round
        ? {
            roundNo: round.round,
            roundType: roundTypeOf(round),
            roundStatus: ROUND_STATUS_CODE[round.status] ?? null,
            startDate: round.startDate,
            endDate: round.endDate,
            startPrice: round.startPrice,
            bidCount: engine.bidsOfRound(round.id).length
          }
        : null
    })
  },

  'POST /auction/web/vehicle/update-condition': (body) => {
    const patch = {}
    if ('mileage' in body) patch.mileage = body.mileage
    if ('remark' in body) patch.remark = body.remark ?? ''
    const res = engine.updateVehicleFields(body.id, patch, operator())
    if (!res.ok) {
      fail(
        {
          NOT_FOUND: CODE.VEHICLE_NOT_FOUND,
          SCHEDULED: CODE.VEHICLE_SCHEDULED,
          MILEAGE_REQUIRED: CODE.MILEAGE_CLEARED
        }[res.error] || CODE.PARAM_ERROR
      )
    }
    return ok()
  },

  'POST /auction/web/vehicle/attachment/upload': async (body) => {
    const vehicleId = body instanceof FormData ? body.get('vehicleId') : body?.vehicleId
    const file = body instanceof FormData ? body.get('file') : body?.file
    const v = getVehicle(vehicleId)
    if (!engine.isVehicleEditable(v)) fail(CODE.VEHICLE_SCHEDULED)
    if (!file || !ATTACHMENT_EXT_LIST.includes(extOf(file.name)) || file.size > ATTACHMENT_MAX_SIZE)
      fail(CODE.ATTACHMENT_INVALID)
    const isPdf = extOf(file.name) === 'pdf'
    const dataUrl = isPdf ? await readAsDataUrl(file) : await downscaleImage(file)
    if (dataUrl.length > DEMO_MAX_STORED_CHARS)
      throw new BizError(CODE.ATTACHMENT_INVALID, null, DEMO_MESSAGES[lang()])
    const res = engine.addAttachment(
      v.id,
      { name: file.name, mime: isPdf ? 'application/pdf' : 'image/jpeg', dataUrl },
      operator()
    )
    if (!res.ok) fail(res.error === 'SCHEDULED' ? CODE.VEHICLE_SCHEDULED : CODE.VEHICLE_NOT_FOUND)
    return ok(attachmentOf(res.attachment, v))
  },

  'POST /auction/web/vehicle/attachment/delete': (body) => {
    const res = engine.removeAttachment(body.vehicleId, body.attachmentId, operator())
    if (!res.ok) {
      fail(
        {
          NOT_FOUND: CODE.VEHICLE_NOT_FOUND,
          SCHEDULED: CODE.VEHICLE_SCHEDULED,
          ATTACHMENT_NOT_FOUND: CODE.ATTACHMENT_NOT_FOUND
        }[res.error] || CODE.PARAM_ERROR
      )
    }
    blobUrlCache.delete(body.attachmentId)
    return ok()
  },

  // ── 排定拍賣 ──
  'POST /auction/web/auction/schedule': (body) => {
    if (!Array.isArray(body.orderNos) || !body.orderNos.length) fail(CODE.PARAM_ERROR)
    if (!engine.activeDealers().length) fail(CODE.NO_ACTIVE_DEALER)
    const res = engine.scheduleAuctionBatch(body.orderNos, body, operator())
    if (!res.ok) {
      if (res.error === 'VALIDATION_FAILED')
        fail(CODE.SCHEDULE_VALIDATION_FAILED, { failures: res.failures })
      if (res.error === 'START_DATE_INVALID' || res.error === 'END_DATE_INVALID')
        fail(CODE.SCHEDULE_DATE_INVALID)
      fail(CODE.PARAM_ERROR)
    }
    return ok({
      batchId: res.rounds[0]?.batchId ?? null,
      vehicleCount: res.rounds.length,
      auctionStatus: res.startsToday ? AUCTION_STATUS.BIDDING : AUCTION_STATUS.NOT_STARTED
    })
  },

  'POST /auction/web/auction/schedule/cancel': (body) => {
    requirePermission(PERMISSION_CODE.CANCEL_SCHEDULE)
    const res = engine.cancelSchedule(body.roundId, operator())
    if (!res.ok) fail(CODE.SCHEDULE_ALREADY_STARTED)
    return ok()
  },

  // ── 拍賣管理四個 tab ──
  'POST /auction/web/auction/pending/list': (body) => {
    const rows = filterAuctionRows(engine.pendingAuctionRows(), body).map(({ vehicle, round }) => ({
      ...auctionBase(vehicle, round),
      roundId: round.id,
      scheduledByName: round.createdBy || null,
      scheduledTime: fmt(round.createdAt)
    }))
    return ok(page(rows, body))
  },

  'POST /auction/web/auction/ongoing/list': (body) => {
    const rows = filterAuctionRows(engine.ongoingAuctionRows(), body).map(({ vehicle, round }) => ({
      ...auctionBase(vehicle, round),
      roundStatus: 20,
      bidCount: engine.bidsOfRound(round.id).length
    }))
    return ok(page(rows, body))
  },

  'POST /auction/web/auction/closed/list': (body) => {
    requirePermission(PERMISSION_CODE.CLOSED_TAB)
    const rows = filterAuctionRows(engine.closedAuctionRows(), body).map(({ vehicle, round }) => {
      const top = engine.highestOfRound(round.id)
      return {
        ...auctionBase(vehicle, round),
        closeDate: round.endDate,
        highestPrice: top.amount,
        tieFlag: top.dealerIds.length > 1
      }
    })
    return ok(page(rows, body))
  },

  'POST /auction/web/auction/awarded/list': (body) => {
    const dealerIds = Array.isArray(body.dealerIds) ? body.dealerIds : []
    const rows = engine
      .awardedAuctionRows()
      .filter(({ vehicle, award, round }) => {
        const info = vehicleInfo(vehicle)
        if (!includesKeyword(vehicle.orderNo, body.orderNo)) return false
        if (!includesKeyword(info.licensingPlateNumber, body.licensingPlateNumber)) return false
        if (body.roundType && roundTypeOf(round) !== Number(body.roundType)) return false
        if (dealerIds.length && !dealerIds.includes(award.dealerId)) return false
        return true
      })
      .map(({ vehicle, award, round }) => {
        const info = vehicleInfo(vehicle)
        return {
          vehicleId: vehicle.id,
          roundId: award.roundId,
          orderNo: vehicle.orderNo,
          makeName: info.makeName,
          seriesName: info.seriesName,
          licensingPlateNumber: info.licensingPlateNumber,
          carYear: info.carYear,
          dealerId: award.dealerId,
          dealerName: engine.dealerById(award.dealerId)?.name ?? '',
          dealPrice: award.amount,
          roundType: roundTypeOf(round),
          dealTime: fmt(award.at),
          dealOperatorName: award.operator || null
        }
      })
    return ok(page(rows, body))
  },

  // ── 催投 ──
  'POST /auction/web/auction/urge/info': (body) => {
    requirePermission(PERMISSION_CODE.URGE)
    const v = getVehicle(body.vehicleId)
    const round = engine.latestRound(v.id)
    if (v.status !== VEHICLE_STATUS.IN_AUCTION || round?.status !== ROUND_STATUS.OPEN)
      fail(CODE.AUCTION_STATUS_CHANGED)
    return ok({
      vehicleId: v.id,
      roundId: round.id,
      endDate: round.endDate,
      dealers: engine.unbidInvitees(round.id).map((dealerId) => ({
        dealerId,
        dealerName: engine.dealerById(dealerId)?.name ?? ''
      })),
      logs: [...(round.urgeLogs || [])]
        .sort((a, b) => b.at - a.at)
        .map((log) => ({
          triggerType: log.auto ? 'AUTO' : 'MANUAL',
          operatorName: log.auto ? null : log.by,
          targetCount: (log.targets || []).length,
          createTime: fmt(log.at)
        }))
    })
  },

  'POST /auction/web/auction/urge': (body) => {
    requirePermission(PERMISSION_CODE.URGE)
    const v = getVehicle(body.vehicleId)
    const round = engine.latestRound(v.id)
    if (v.status !== VEHICLE_STATUS.IN_AUCTION || !round) fail(CODE.AUCTION_STATUS_CHANGED)
    const res = engine.sendUrge(round.id, operator())
    if (!res.ok) fail(res.error === 'NO_TARGET' ? CODE.NO_UNBID_DEALER : CODE.AUCTION_STATUS_CHANGED)
    return ok({ sentCount: res.targets.length })
  },

  // ── 出價紀錄與成交 ──
  'POST /auction/web/auction/bid-records': (body) => {
    const v = getVehicle(body.vehicleId)
    const award = engine.awardOf(v.id)
    let rounds = []
    if (v.status === VEHICLE_STATUS.CLOSED) {
      requirePermission(PERMISSION_CODE.CLOSED_TAB)
      rounds = [engine.latestRound(v.id)].filter(Boolean)
    } else if (v.status === VEHICLE_STATUS.AWARDED || v.status === VEHICLE_STATUS.SETTLED) {
      requirePermission(PERMISSION_CODE.AWARDED_DETAIL)
      rounds = engine.roundsOf(v.id)
    } else {
      fail(CODE.AUCTION_STATUS_CHANGED)
    }
    return ok({
      vehicleId: v.id,
      auctionStatus: STATUS_CODE[v.status],
      designatable: v.status === VEHICLE_STATUS.CLOSED && !!rounds[0] && engine.canDesignate(rounds[0].id),
      pendingDeal: null,
      rounds: rounds.map((round) => {
        const top = engine.highestOfRound(round.id)
        const isDealRound = !!award && award.roundId === round.id
        return {
          roundId: round.id,
          roundNo: round.round,
          roundType: roundTypeOf(round),
          startDate: round.startDate,
          endDate: round.endDate,
          startPrice: round.startPrice,
          highestPrice: top.amount,
          tieFlag: top.dealerIds.length > 1,
          dealFlag: isDealRound,
          records: engine.rankingOfRound(round.id).map((row) => ({
            rank: row.rank,
            dealerId: row.dealerId,
            dealerName: row.dealerName,
            bidAmount: row.amount,
            bidTime: fmt(row.at),
            tieFlag: row.tied,
            enabledFlag: row.active,
            dealFlag: isDealRound && award.dealerId === row.dealerId
          }))
        }
      })
    })
  },

  'POST /auction/web/auction/designate': (body) => {
    requirePermission(PERMISSION_CODE.DESIGNATE)
    const v = getVehicle(body.vehicleId)
    // 送出時核對 roundId 仍為本輪
    if (engine.latestRound(v.id)?.id !== body.roundId) fail(CODE.AUCTION_STATUS_CHANGED)
    const res = engine.designateWinner(v.id, body.roundId, body.dealerId, operator())
    if (!res.ok) {
      fail(
        {
          NOT_FOUND: CODE.VEHICLE_NOT_FOUND,
          STATUS_CHANGED: CODE.AUCTION_STATUS_CHANGED,
          NOT_ALLOWED: CODE.DEALER_NOT_DESIGNATABLE,
          DEAL_API_FAILED: CODE.DEAL_NOTIFY_FAILED
        }[res.error] || CODE.PARAM_ERROR
      )
    }
    const award = engine.awardOf(v.id)
    return ok({
      vehicleId: v.id,
      auctionStatus: AUCTION_STATUS.AWARDED,
      dealerId: award.dealerId,
      dealPrice: award.amount
    })
  },

  'POST /auction/web/auction/additional-round': (body) => {
    requirePermission(PERMISSION_CODE.ADDITIONAL_ROUND)
    const v = getVehicle(body.vehicleId)
    if (body.roundId && engine.latestRound(v.id)?.id !== body.roundId) fail(CODE.AUCTION_STATUS_CHANGED)
    const dealerIds = Array.isArray(body.dealerIds) ? body.dealerIds : []
    if (!dealerIds.length) fail(CODE.PARAM_ERROR)
    if (dealerIds.some((id) => engine.dealerById(id)?.status !== 'ACTIVE')) fail(CODE.INVITEE_INVALID)
    const res = engine.startExtraRound(
      v.id,
      { startDate: body.startDate, endDate: body.endDate, inviteeIds: dealerIds },
      operator()
    )
    if (!res.ok) {
      fail(
        {
          NOT_FOUND: CODE.VEHICLE_NOT_FOUND,
          STATUS_CHANGED: CODE.AUCTION_STATUS_CHANGED,
          START_DATE_INVALID: CODE.SCHEDULE_DATE_INVALID,
          END_DATE_INVALID: CODE.SCHEDULE_DATE_INVALID,
          INVITEE_REQUIRED: CODE.INVITEE_INVALID
        }[res.error] || CODE.PARAM_ERROR
      )
    }
    return ok({
      roundId: res.round.id,
      roundNo: res.round.round,
      auctionStatus: res.startsToday ? AUCTION_STATUS.BIDDING : AUCTION_STATUS.NOT_STARTED,
      startPrice: res.round.startPrice
    })
  },

  // ── 廠商管理 ──
  'POST /auction/web/dealer/list': (body) => {
    const list = [...db.dealers]
      .filter((d) => {
        if (!includesKeyword(d.name, body.dealerName)) return false
        if (!includesKeyword(d.contactName, body.contactName)) return false
        if (body.enableFlag !== undefined && body.enableFlag !== null && body.enableFlag !== '') {
          const flag = d.status === 'ACTIVE' ? ENABLE_FLAG.ENABLED : ENABLE_FLAG.DISABLED
          if (flag !== Number(body.enableFlag)) return false
        }
        return true
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((d) => ({
        id: d.id,
        dealerName: d.name,
        contactName: d.contactName,
        phone: d.phone,
        email: d.email,
        remark: d.remark || null,
        enableFlag: d.status === 'ACTIVE' ? ENABLE_FLAG.ENABLED : ENABLE_FLAG.DISABLED,
        lockedFlag: d.locked ? LOCKED_FLAG.LOCKED : LOCKED_FLAG.UNLOCKED,
        createTime: fmt(d.createdAt),
        // Demo 專用：正式 API 不回密碼，僅為試用方便於列表顯示
        demoPassword: d.password
      }))
    return ok(list)
  },

  'POST /auction/web/dealer/save': (body) => {
    const payload = {
      name: String(body.dealerName || '').trim(),
      contactName: String(body.contactName || '').trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email || '').trim(),
      remark: body.remark || ''
    }
    if (!payload.name || !payload.contactName || !payload.phone || !payload.email) fail(CODE.PARAM_ERROR)
    const res = body.id
      ? (getDealer(body.id), engine.updateDealer(body.id, payload, operator()))
      : engine.addDealer(payload, operator())
    if (!res.ok) fail(res.error === 'EMAIL_DUPLICATED' ? CODE.DEALER_EMAIL_DUPLICATED : CODE.DEALER_NOT_FOUND)
    return ok()
  },

  'POST /auction/web/dealer/toggle-status': (body) => {
    getDealer(body.id)
    engine.setDealerStatus(body.id, Number(body.enableFlag) === ENABLE_FLAG.ENABLED, operator())
    return ok()
  },

  'POST /auction/web/dealer/reset-password': (body) => {
    getDealer(body.id)
    engine.resetDealerPassword(body.id, operator())
    return ok()
  },

  'POST /auction/web/dealer/unlock': (body) => {
    getDealer(body.id)
    const res = engine.unlockDealer(body.id, operator())
    if (!res.ok) fail(CODE.DEALER_NOT_LOCKED)
    return ok()
  }
}

// ── axios adapter ────────────────────────────────────
function parseBody(data) {
  if (data instanceof FormData) return data
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return {}
    }
  }
  return data || {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function mockAdapter(config) {
  const method = String(config.method || 'get').toUpperCase()
  const path = String(config.url || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  const key = `${method} ${path.startsWith('/') ? path : `/${path}`}`
  const handler = handlers[key]
  await sleep(MOCK_DELAY_MS)

  let body
  if (!handler) {
    console.warn('[demo mock] 未實作的 API：', key)
    body = { code: CODE.SYSTEM_ERROR, message: `Demo 未實作：${key}`, data: null }
  } else {
    try {
      const input = method === 'GET' ? { ...(config.params || {}) } : parseBody(config.data)
      body = await handler(input)
    } catch (e) {
      if (e instanceof BizError) {
        body = { code: e.code, message: e.message, data: e.data }
      } else {
        console.error('[demo mock]', key, e)
        body = { code: CODE.SYSTEM_ERROR, message: MESSAGES[lang()][CODE.SYSTEM_ERROR], data: null }
      }
    }
  }

  // 以 JSON 往返模擬網路傳輸，避免畫面直接改到共用的 reactive db
  return {
    data: JSON.stringify(body),
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
    request: {}
  }
}
