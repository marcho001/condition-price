import dayjs from 'dayjs'
import { db, serverNow, uid } from './store.js'
import { endOfDay, startOfDay } from './format.js'
import { noticeText } from './noticeText.js'
import { carPhoto } from './photos.js'
import {
  VEHICLE_STATUS,
  ROUND_STATUS,
  NOTICE_TYPE,
  EMAIL_TYPE,
  EDITABLE_KEYS,
  REMARK_MAX_LENGTH,
  makeIdOf
} from './constants.js'

// 這支檔案扮演兩站共用的「後端拍賣核心」。兩個前端各自的 mock adapter
// （src/internal/mock、src/dealer/mock）把真實系統的 API 路徑對應到這裡的函式。

// ── 時間 ─────────────────────────────────────────────
// 伺服器日期（JST）。Demo 的時間快轉會一併影響
export const serverToday = () => dayjs(serverNow.value).format('YYYY-MM-DD')

// 自動催投時點：結標日前 2 天 09:00（JST）
const autoUrgeAt = (endDate) =>
  dayjs(endDate).subtract(2, 'day').hour(9).minute(0).second(0).millisecond(0).valueOf()

// 上架／加價拍賣通知：開始日＝今日時 submit 即發；否則於開始日 09:00（JST）發出
const startNoticeAt = (startDate) => dayjs(startDate).hour(9).minute(0).second(0).millisecond(0).valueOf()

// 「結標日前 2 天」須晚於開始日才自動催投；排定當下該時點已過亦不發
function autoUrgeSkipped(startDate, endDate, now) {
  const urgeDay = dayjs(endDate).subtract(2, 'day')
  return !urgeDay.isAfter(dayjs(startDate), 'day') || autoUrgeAt(endDate) <= now
}

// ── 查詢 ─────────────────────────────────────────────
export const vehicleById = (id) => db.vehicles.find((v) => v.id === id)
export const vehicleByOrderNo = (orderNo) => db.vehicles.find((v) => v.orderNo === orderNo)
export const dealerById = (id) => db.dealers.find((x) => x.id === id)
export const roundById = (id) => db.rounds.find((r) => r.id === id)

// 顯示用車輛資料：收車現況值優先，否則回落至進件值
export function vehicleView(v) {
  if (!v) return {}
  return { ...v.intake, ...stripEmpty(v.current), makeId: makeIdOf(v.intake.makeName) }
}

function stripEmpty(o) {
  const out = {}
  Object.entries(o || {}).forEach(([k, val]) => {
    if (val !== '' && val !== null && val !== undefined) out[k] = val
  })
  return out
}

// 有效輪次（不含取消排定而作廢的輪），依輪次序號排列
export const roundsOf = (vehicleId) =>
  db.rounds
    .filter((r) => r.vehicleId === vehicleId && r.status !== ROUND_STATUS.CANCELLED)
    .sort((a, b) => a.round - b.round)

export const latestRound = (vehicleId) => roundsOf(vehicleId).slice(-1)[0] || null

export const roundStartAt = (round) => (round ? startOfDay(round.startDate) : 0)
export const roundEndAt = (round) => (round ? endOfDay(round.endDate) : 0)
export const roundRemaining = (round) => roundEndAt(round) - serverNow.value

export const bidsOfRound = (roundId) => db.bids.filter((b) => b.roundId === roundId)

export const bidOf = (roundId, dealerId) =>
  db.bids.find((b) => b.roundId === roundId && b.dealerId === dealerId) || null

export function highestOfRound(roundId) {
  const list = bidsOfRound(roundId)
  if (!list.length) return { amount: null, dealerIds: [] }
  const max = Math.max(...list.map((b) => b.amount))
  return { amount: max, dealerIds: list.filter((b) => b.amount === max).map((b) => b.dealerId) }
}

// 該輪具出價資格的全部廠商，依金額高到低排名；未出價者排最後。
// 最高價並列時標示「同價」，停用廠商標示「停用」
export function rankingOfRound(roundId) {
  const round = roundById(roundId)
  if (!round) return []
  const rows = (round.inviteeIds || []).map((dealerId) => {
    const b = bidOf(roundId, dealerId)
    const dealer = dealerById(dealerId)
    return {
      dealerId,
      dealer,
      dealerName: dealer?.name ?? '',
      active: dealer?.status === 'ACTIVE',
      amount: b ? b.amount : null,
      at: b ? b.at : null,
      history: b ? b.history : []
    }
  })
  rows.sort((a, b) => {
    if (a.amount === null && b.amount === null) return 0
    if (a.amount === null) return 1
    if (b.amount === null) return -1
    return b.amount - a.amount
  })
  let rank = 0
  let prev = null
  rows.forEach((r, i) => {
    if (r.amount === null) {
      r.rank = null
      return
    }
    if (r.amount !== prev) {
      rank = i + 1
      prev = r.amount
    }
    r.rank = rank
  })
  const top = highestOfRound(roundId)
  rows.forEach((r) => {
    r.isTop = r.amount !== null && r.amount === top.amount
    r.tied = r.isTop && top.dealerIds.length > 1
  })
  return rows
}

export const isTiedRound = (roundId) => highestOfRound(roundId).dealerIds.length > 1

export const awardOf = (vehicleId) => db.awards.find((a) => a.vehicleId === vehicleId) || null

export const activeDealers = () => db.dealers.filter((x) => x.status === 'ACTIVE')

// ── 通知 ─────────────────────────────────────────────
// 停用中的廠商不再收到任何拍賣通知（含催投）
function notify(dealerIds, type, round, extra = {}) {
  const text = noticeText(type, {
    round,
    vehicle: vehicleView(vehicleById(round.vehicleId)),
    vehicles: (extra.vehicleIds || []).map((id) => vehicleView(vehicleById(id)))
  })
  dealerIds
    .filter((id) => dealerById(id)?.status === 'ACTIVE')
    .forEach((dealerId) => {
      db.notifications.push({
        id: uid('N'),
        dealerId,
        type,
        vehicleId: round.vehicleId,
        roundId: round.id,
        at: serverNow.value,
        read: false,
        ...text,
        ...extra
      })
    })
}

// 帳號通知（事件 6、7）僅 Email —— 不發 SMS、不進站內通知
function sendAccountEmail(dealer, type, password) {
  db.emails.push({
    id: uid('M'),
    dealerId: dealer.id,
    to: dealer.email,
    type,
    password,
    at: serverNow.value
  })
}

export const allEmails = () => [...db.emails].sort((a, b) => b.at - a.at)

export const notificationsOf = (dealerId) =>
  db.notifications.filter((n) => n.dealerId === dealerId).sort((a, b) => b.at - a.at)

export const unreadCountOf = (dealerId) =>
  db.notifications.filter((n) => n.dealerId === dealerId && !n.read).length

export function markNoticesRead(ids, dealerId) {
  const set = new Set(ids)
  db.notifications.forEach((n) => {
    if (set.has(n.id) && n.dealerId === dealerId) n.read = true
  })
}

// 勾選多筆刪除：僅刪除該廠商自己的站內通知，不影響其他廠商與已寄出的 Email / SMS。不可復原
export function deleteNotices(ids, dealerId) {
  const set = new Set(ids)
  const before = db.notifications.length
  db.notifications = db.notifications.filter((n) => !(set.has(n.id) && n.dealerId === dealerId))
  return before - db.notifications.length
}

// ── 附件 ─────────────────────────────────────────────
const SAMPLE_PDF_URL = new URL('./assets/sample.pdf', import.meta.url).href

export const isPdfAttachment = (att) => att.mime === 'application/pdf' || /\.pdf$/i.test(att.name)

// 附件的檔案 URL：內部上傳的檔案存成 data URL；seed 的照片依 kind 以 SVG 產生，pdf 用範例檔
export function attachmentUrl(att, vehicle) {
  if (att.dataUrl) return att.dataUrl
  if (isPdfAttachment(att)) return SAMPLE_PDF_URL
  return carPhoto(att.kind, vehicleView(vehicle))
}

// ── 稽核 ─────────────────────────────────────────────
function audit(action, detail) {
  db.auditLogs.push({ id: uid('L'), action, detail, at: serverNow.value })
}

// ── 車輛管理 ──────────────────────────────────────────
// 只有待排定拍賣可編輯（排定送出後含待開始一律唯讀）
export const isVehicleEditable = (v) => v?.status === VEHICLE_STATUS.PENDING_SCHEDULE

// 走行距離：0 以上的整數，不提供清空；備考上限 300 字
export function updateVehicleFields(vehicleId, patch, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return { ok: false, error: 'NOT_FOUND' }
  if (!isVehicleEditable(v)) return { ok: false, error: 'SCHEDULED' }
  if ('mileage' in patch) {
    const m = patch.mileage
    if (m === null || m === '' || m === undefined) {
      if (v.current.mileage !== undefined && v.current.mileage !== null && v.current.mileage !== '')
        return { ok: false, error: 'MILEAGE_REQUIRED' }
    } else if (!Number.isInteger(Number(m)) || Number(m) < 0) {
      return { ok: false, error: 'MILEAGE_INVALID' }
    }
  }
  if ('remark' in patch && String(patch.remark ?? '').length > REMARK_MAX_LENGTH)
    return { ok: false, error: 'REMARK_TOO_LONG' }

  Object.entries(patch).forEach(([key, raw]) => {
    if (!EDITABLE_KEYS.includes(key)) return
    const next = key === 'mileage' && raw !== '' && raw !== null && raw !== undefined ? Number(raw) : raw ?? ''
    const before = v.current[key] ?? ''
    if (String(before) === String(next)) return
    v.current[key] = next
    // 每次更新留存欄位、前後值、操作人、時間
    v.fieldLogs.push({ field: key, before, after: next, operator, at: serverNow.value })
  })
  return { ok: true }
}

export function addAttachment(vehicleId, att, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return { ok: false, error: 'NOT_FOUND' }
  if (!isVehicleEditable(v)) return { ok: false, error: 'SCHEDULED' }
  const item = {
    id: uid('A'),
    uploader: operator,
    uploadedAt: serverNow.value,
    ...att
  }
  v.attachments.push(item)
  audit('attachment.add', { vehicleId, name: att.name, operator })
  return { ok: true, attachment: item }
}

export function removeAttachment(vehicleId, attId, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return { ok: false, error: 'NOT_FOUND' }
  if (!isVehicleEditable(v)) return { ok: false, error: 'SCHEDULED' }
  const i = v.attachments.findIndex((a) => a.id === attId)
  if (i < 0) return { ok: false, error: 'ATTACHMENT_NOT_FOUND' }
  audit('attachment.remove', { vehicleId, name: v.attachments[i].name, operator })
  v.attachments.splice(i, 1)
  return { ok: true }
}

// 必填資料已填齊才可勾選排定 —— 目前為走行距離（可填 0）
export function canSchedule(vehicle) {
  const m = vehicle?.current?.mileage
  return m !== undefined && m !== null && m !== ''
}

// 待排定拍賣的車輛（車輛管理列表），預設收車日由近到遠
export const pendingVehicles = () =>
  db.vehicles
    .filter((v) => v.status === VEHICLE_STATUS.PENDING_SCHEDULE)
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0))

// 下一個輪次序號：取消排定作廢的輪不佔序號，重新排定時沿用同一序號
const nextRoundNo = (vehicleId) => roundsOf(vehicleId).length + 1

// 開始一輪：轉入投標中。首輪的「全體廠商」以開始日 00:00 時啟用中的廠商為準
function openRound(round) {
  round.status = ROUND_STATUS.OPEN
  if (round.round === 1) round.inviteeIds = activeDealers().map((x) => x.id)
  const v = vehicleById(round.vehicleId)
  if (v) v.status = VEHICLE_STATUS.IN_AUCTION
}

// 上架通知：依排定批次歸組，一個批次只發一封；清單只列「當下仍在本批」的車輛。整批都被取消則不發
function sendBatchNotice(batch) {
  const rounds = batch.roundIds.map(roundById).filter((r) => r && r.status === ROUND_STATUS.OPEN)
  batch.noticeSent = true
  if (!rounds.length) return
  const vehicleIds = rounds.map((r) => r.vehicleId)
  const invitees = [...new Set(rounds.flatMap((r) => r.inviteeIds))]
  notify(invitees, NOTICE_TYPE.NEW_AUCTION, rounds[0], {
    batchId: batch.id,
    vehicleIds,
    count: vehicleIds.length,
    endDate: batch.endDate
  })
}

// 排定拍賣為批次操作：勾選的 orderNo 以陣列傳入、只打一支 API、全有或全無。
// 後端就陣列內全部車輛重新檢核（走行距離已填、狀態仍為待排定拍賣），
// 任一筆不通過即整批都不上架，並明確指出是哪幾筆、原因為何。
export function scheduleAuctionBatch(orderNos, { startDate, endDate }, operator) {
  const list = orderNos || []
  if (!list.length) return { ok: false, error: 'EMPTY', failures: [] }
  const today = serverToday()
  if (!startDate || startDate < today) return { ok: false, error: 'START_DATE_INVALID', failures: [] }
  if (!endDate || endDate <= startDate) return { ok: false, error: 'END_DATE_INVALID', failures: [] }

  const failures = []
  const targets = []
  const seen = new Set()
  list.forEach((orderNo) => {
    if (seen.has(orderNo)) {
      failures.push({ orderNo, reason: 'DUPLICATED' })
      return
    }
    seen.add(orderNo)
    const v = vehicleByOrderNo(orderNo)
    if (!v) failures.push({ orderNo, reason: 'NOT_FOUND' })
    else if (v.status !== VEHICLE_STATUS.PENDING_SCHEDULE) failures.push({ orderNo, reason: 'STATUS_INVALID' })
    else if (!canSchedule(v)) failures.push({ orderNo, reason: 'MILEAGE_EMPTY' })
    else targets.push(v)
  })
  if (failures.length) return { ok: false, error: 'VALIDATION_FAILED', failures }

  const now = serverNow.value
  const startsToday = startDate === today
  const batch = { id: uid('BT'), roundIds: [], startDate, endDate, operator, at: now, noticeSent: false }

  const rounds = targets.map((v) => {
    const round = {
      id: uid('R'),
      vehicleId: v.id,
      round: nextRoundNo(v.id),
      batchId: batch.id,
      startDate,
      endDate,
      startPrice: 0,
      // 首輪邀請對象為全體廠商；待開始期間尚未確定，開始日 00:00 時取啟用中的廠商
      inviteeIds: null,
      status: ROUND_STATUS.PENDING,
      createdBy: operator,
      createdAt: now,
      urgeLogs: [],
      autoUrgeSent: autoUrgeSkipped(startDate, endDate, now),
      noticeSent: false
    }
    db.rounds.push(round)
    batch.roundIds.push(round.id)
    v.status = VEHICLE_STATUS.NOT_STARTED
    if (startsToday) openRound(round)
    return round
  })
  db.batches.push(batch)
  if (startsToday) sendBatchNotice(batch)

  audit('auction.schedule', {
    batchId: batch.id,
    orderNos: targets.map((v) => v.orderNo),
    startDate,
    endDate,
    operator
  })
  return { ok: true, rounds, startsToday }
}

// 取消排定：僅待開始可取消，逐筆操作。首輪退回車輛管理、加價輪退回已結標。
// 本輪作廢（不佔輪次序號），不發任何廠商通知
export function cancelSchedule(roundId, operator) {
  const round = roundById(roundId)
  if (!round) return { ok: false, error: 'NOT_FOUND' }
  if (round.status !== ROUND_STATUS.PENDING) return { ok: false, error: 'ALREADY_STARTED' }
  round.status = ROUND_STATUS.CANCELLED
  round.cancelledAt = serverNow.value
  round.cancelledBy = operator
  const v = vehicleById(round.vehicleId)
  const backTo = round.round === 1 ? VEHICLE_STATUS.PENDING_SCHEDULE : VEHICLE_STATUS.CLOSED
  v.status = backTo
  audit('auction.cancelSchedule', {
    orderNo: v.orderNo,
    roundId,
    roundType: round.round === 1 ? 'FIRST' : 'EXTRA',
    startDate: round.startDate,
    endDate: round.endDate,
    backTo,
    operator
  })
  return { ok: true, backTo }
}

// 進入加價拍賣：邀請名單為勾選的啟用中廠商（不限前一輪是否出價），送出時固定。
// 起標價＝前一輪最高出價（無人出價時為 0 元），輪次序號 ＋1
export function startExtraRound(vehicleId, { startDate, endDate, inviteeIds }, operator) {
  const v = vehicleById(vehicleId)
  const prev = latestRound(vehicleId)
  if (!v || !prev) return { ok: false, error: 'NOT_FOUND' }
  if (v.status !== VEHICLE_STATUS.CLOSED) return { ok: false, error: 'STATUS_CHANGED' }
  const today = serverToday()
  if (!startDate || startDate < today) return { ok: false, error: 'START_DATE_INVALID' }
  if (!endDate || endDate <= startDate) return { ok: false, error: 'END_DATE_INVALID' }
  const invitees = (inviteeIds || []).filter((id) => dealerById(id)?.status === 'ACTIVE')
  if (!invitees.length) return { ok: false, error: 'INVITEE_REQUIRED' }

  const now = serverNow.value
  const round = {
    id: uid('R'),
    vehicleId,
    round: prev.round + 1,
    batchId: null,
    startDate,
    endDate,
    startPrice: highestOfRound(prev.id).amount || 0,
    inviteeIds: invitees,
    status: ROUND_STATUS.PENDING,
    createdBy: operator,
    createdAt: now,
    urgeLogs: [],
    autoUrgeSent: autoUrgeSkipped(startDate, endDate, now),
    noticeSent: false
  }
  db.rounds.push(round)
  v.status = VEHICLE_STATUS.NOT_STARTED
  if (startDate === today) {
    openRound(round)
    round.noticeSent = true
    notify(round.inviteeIds, NOTICE_TYPE.EXTRA_ROUND_INVITE, round)
  }
  audit('auction.extraRound', { vehicleId, roundId: round.id, operator, inviteeIds: invitees })
  return { ok: true, round, startsToday: startDate === today }
}

// 本輪具出價資格、目前為啟用、且尚未出價的廠商 —— 即催投的收件對象
export function unbidInvitees(roundId) {
  const round = roundById(roundId)
  if (!round) return []
  return (round.inviteeIds || []).filter((id) => {
    const dealer = dealerById(id)
    return dealer && dealer.status === 'ACTIVE' && !bidOf(roundId, id)
  })
}

// 手動催投：發送對象以送出當下重新計算的名單為準
export function sendUrge(roundId, by) {
  const round = roundById(roundId)
  if (!round || round.status !== ROUND_STATUS.OPEN) return { ok: false, error: 'STATUS_CHANGED' }
  const targets = unbidInvitees(roundId)
  if (!targets.length) return { ok: false, error: 'NO_TARGET' }
  notify(targets, NOTICE_TYPE.CLOSING_SOON, round)
  round.urgeLogs.push({ by, auto: false, at: serverNow.value, targets })
  audit('auction.urge', { roundId, by, targets })
  return { ok: true, targets }
}

// ── 出價 ─────────────────────────────────────────────
// 下限一律 ≥ 1 円。第一輪：≥ 1 円（起標價 0 元僅為顯示基準）。加價輪：必須高於起標價
export function bidFloor(round) {
  return round.round === 1 ? 1 : round.startPrice + 1
}

// 對外站可見範圍：只有投標中、且在該輪邀請名單內的廠商看得到（待開始一律查無）
export function canDealerSeeRound(roundId, dealerId) {
  const round = roundById(roundId)
  if (!round || !dealerId || round.status !== ROUND_STATUS.OPEN) return false
  if (roundRemaining(round) <= 0) return false
  return (round.inviteeIds || []).includes(dealerId)
}

export function placeBid(roundId, dealerId, amount) {
  const round = roundById(roundId)
  if (!round || round.status === ROUND_STATUS.PENDING || round.status === ROUND_STATUS.CANCELLED)
    return { ok: false, error: 'NOT_FOUND' }
  if (round.status !== ROUND_STATUS.OPEN || roundRemaining(round) <= 0) return { ok: false, error: 'CLOSED' }
  const dealer = dealerById(dealerId)
  if (!dealer || dealer.status !== 'ACTIVE' || !(round.inviteeIds || []).includes(dealerId))
    return { ok: false, error: 'NOT_ELIGIBLE' }
  if (!Number.isInteger(amount)) return { ok: false, error: 'INVALID' }
  if (amount < bidFloor(round)) return { ok: false, error: round.round === 1 ? 'BELOW_FIRST_FLOOR' : 'BELOW_EXTRA_FLOOR' }

  const now = serverNow.value
  const exist = bidOf(roundId, dealerId)
  if (exist) {
    exist.amount = amount
    exist.at = now
    exist.history.push({ amount, at: now })
  } else {
    db.bids.push({ id: uid('B'), roundId, dealerId, amount, at: now, history: [{ amount, at: now }] })
  }
  audit('bid.place', { roundId, dealerId, amount })
  return { ok: true, amount, at: now }
}

// 放棄出價：截止前將本輪出價初始化回「未出價」，不論中途是否修改過金額一律清除。
// 內部的已出價家數隨之減 1，並重新納入催投對象
export function cancelBid(roundId, dealerId) {
  const round = roundById(roundId)
  if (!round || round.status === ROUND_STATUS.PENDING || round.status === ROUND_STATUS.CANCELLED)
    return { ok: false, error: 'NOT_FOUND' }
  if (round.status !== ROUND_STATUS.OPEN || roundRemaining(round) <= 0) return { ok: false, error: 'CLOSED' }
  if (!(round.inviteeIds || []).includes(dealerId)) return { ok: false, error: 'NOT_ELIGIBLE' }
  const i = db.bids.findIndex((b) => b.roundId === roundId && b.dealerId === dealerId)
  if (i < 0) return { ok: false, error: 'NO_BID' }
  const cleared = db.bids[i].amount
  db.bids.splice(i, 1)
  // 稽核留存放棄的時間與被清除的金額
  audit('bid.cancel', { roundId, dealerId, clearedAmount: cleared })
  return { ok: true, clearedAmount: cleared }
}

// ── 成交 ─────────────────────────────────────────────
// 「指定成交廠商」是唯一的成交出口：可選對象為該輪有出價、且目前為啟用的廠商（含非最高價）。
// 停用廠商的出價仍列在排名中，但不可指定
export function designatableBids(roundId) {
  return bidsOfRound(roundId)
    .map((b) => {
      const dealer = dealerById(b.dealerId)
      return { dealerId: b.dealerId, dealer, active: dealer?.status === 'ACTIVE', amount: b.amount, at: b.at }
    })
    .sort((a, b) => b.amount - a.amount)
}

export const canDesignate = (roundId) => designatableBids(roundId).some((x) => x.active)

// 成交通知（拍賣 → 貸後）：三支介接 API 中唯一由本模組主動發出的一支。
// 呼叫成功才視為已決標；失敗時訂單留在已結標、狀態不變，得標／未得標通知一律不發
function callDealClosedApi(payload) {
  const ok = !db.demo.dealApiFail
  db.callbackLogs.push({
    id: uid('CB'),
    api: 'dealClosed',
    direction: 'out',
    payload,
    result: ok ? 'SUCCESS' : 'FAILED',
    at: serverNow.value
  })
  return ok
}

export function designateWinner(vehicleId, roundId, dealerId, operator) {
  const vehicle = vehicleById(vehicleId)
  const round = roundById(roundId)
  if (!vehicle || !round) return { ok: false, error: 'NOT_FOUND' }
  if (vehicle.status !== VEHICLE_STATUS.CLOSED || round.status !== ROUND_STATUS.CLOSED)
    return { ok: false, error: 'STATUS_CHANGED' }
  // 未出價、停用的廠商不可指定；成交金額等於該廠商自己的出價金額，內部不可輸入或調整
  const bid = bidOf(roundId, dealerId)
  if (!bid || dealerById(dealerId)?.status !== 'ACTIVE') return { ok: false, error: 'NOT_ALLOWED' }

  const at = serverNow.value
  const sent = callDealClosedApi({ orderNo: vehicle.orderNo, dealerId, amount: bid.amount, at })
  if (!sent) {
    audit('auction.designate.failed', { vehicleId, roundId, dealerId, amount: bid.amount, operator })
    return { ok: false, error: 'DEAL_API_FAILED' }
  }

  db.awards.push({ vehicleId, roundId, dealerId, amount: bid.amount, operator, at, settled: false, settledAt: null })
  vehicle.status = VEHICLE_STATUS.AWARDED
  notify([dealerId], NOTICE_TYPE.WON, round)
  notify((round.inviteeIds || []).filter((id) => id !== dealerId), NOTICE_TYPE.LOST, round)
  audit('auction.designate', { vehicleId, roundId, dealerId, amount: bid.amount, operator })
  return { ok: true }
}

// ── 與貸後的介接（入向兩支，須冪等；本模組不提供對應的手動按鈕）────────
// 收車通知：貸後收車後帶 orderNo 與收車日呼叫，本模組依 orderNo 取進件資料建立待排定拍賣的車輛。
// 附件不從進件帶入，車輛建立時附件一律為空
export function receiveVehicleCallback({ orderNo, receivedAt, operator }) {
  const log = (result) =>
    db.callbackLogs.push({
      id: uid('CB'),
      api: 'receiveVehicle',
      direction: 'in',
      payload: { orderNo, receivedAt, operator },
      result,
      at: serverNow.value
    })

  const exist = vehicleByOrderNo(orderNo)
  if (exist) {
    if (exist.status !== VEHICLE_STATUS.PENDING_SCHEDULE) {
      log('ALREADY_IN_AUCTION')
      return { ok: false, error: 'ALREADY_IN_AUCTION' }
    }
    // 同一 orderNo 重複呼叫不重複建立，回既有那筆並視為成功
    log('DUPLICATED')
    return { ok: true, duplicated: true, vehicle: exist }
  }
  const intake = db.intakePool.find((x) => x.orderNo === orderNo)
  if (!intake) {
    log('ORDER_NOT_FOUND')
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }
  if (!receivedAt) {
    log('RECEIVED_AT_REQUIRED')
    return { ok: false, error: 'RECEIVED_AT_REQUIRED' }
  }
  const vehicle = {
    ...JSON.parse(JSON.stringify(intake.vehicle)),
    receivedAt,
    status: VEHICLE_STATUS.PENDING_SCHEDULE,
    attachments: []
  }
  db.vehicles.push(vehicle)
  db.intakePool.splice(db.intakePool.indexOf(intake), 1)
  log('SUCCESS')
  audit('callback.receiveVehicle', { orderNo, receivedAt, operator })
  return { ok: true, vehicle }
}

// 結清通知：貸後在車輛過戶並收到款項後呼叫，本模組註記結清並以軟刪除自已決標移除
export function settleOrderCallback({ orderNo }) {
  const log = (result) =>
    db.callbackLogs.push({
      id: uid('CB'),
      api: 'settleOrder',
      direction: 'in',
      payload: { orderNo },
      result,
      at: serverNow.value
    })

  const vehicle = vehicleByOrderNo(orderNo)
  if (!vehicle) {
    log('ORDER_NOT_FOUND')
    return { ok: false, error: 'ORDER_NOT_FOUND' }
  }
  const award = awardOf(vehicle.id)
  if (!award) {
    log('NOT_AWARDED')
    return { ok: false, error: 'NOT_AWARDED' }
  }
  if (award.settled) {
    // 重複呼叫不重複處理，回既有那筆並視為成功
    log('DUPLICATED')
    return { ok: true, duplicated: true }
  }
  award.settled = true
  award.settledAt = serverNow.value
  vehicle.status = VEHICLE_STATUS.SETTLED
  log('SUCCESS')
  audit('callback.settleOrder', { orderNo })
  return { ok: true }
}

// 已決標且尚未結清的訂單 —— 結清是離開已決標列表的唯一觸發點
export const settleableOrders = () =>
  db.awards
    .filter((a) => !a.settled)
    .map((a) => ({ award: a, vehicle: vehicleById(a.vehicleId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.AWARDED)

// ── 拍賣管理四個 tab 的資料來源 ────────────────────────
// 每台車只會出現在一個 tab；列的主體是「該車目前的那一輪」
function currentRows(status) {
  return db.vehicles
    .filter((v) => v.status === status)
    .map((v) => ({ vehicle: v, round: latestRound(v.id) }))
    .filter((x) => x.round)
}

// 待開始：開始日由早到晚
export const pendingAuctionRows = () =>
  currentRows(VEHICLE_STATUS.NOT_STARTED).sort((a, b) => (a.round.startDate < b.round.startDate ? -1 : a.round.startDate > b.round.startDate ? 1 : 0))

// 拍賣進行中：收車日由近到遠
export const ongoingAuctionRows = () =>
  currentRows(VEHICLE_STATUS.IN_AUCTION).sort((a, b) =>
    a.vehicle.receivedAt < b.vehicle.receivedAt ? 1 : a.vehicle.receivedAt > b.vehicle.receivedAt ? -1 : 0
  )

// 已結標：結標日由近到遠
export const closedAuctionRows = () =>
  currentRows(VEHICLE_STATUS.CLOSED).sort((a, b) => (a.round.endDate < b.round.endDate ? 1 : a.round.endDate > b.round.endDate ? -1 : 0))

// 已決標：決標時間由近到遠
export const awardedAuctionRows = () =>
  settleableOrders()
    .map(({ award, vehicle }) => ({ vehicle, award, round: roundById(award.roundId) }))
    .sort((a, b) => b.award.at - a.award.at)

// ── 廠商管理 ──────────────────────────────────────────
export const LOGIN_FAIL_LIMIT = 5

// 密碼一律由本模組產生：a-zA-Z0-9 隨機 8 碼（不含符號），每次重新隨機取值
const PASSWORD_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function genPassword() {
  return Array.from({ length: 8 }, () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]).join('')
}

// 登入帳號不可與其他廠商重複（含已停用的廠商）
export function isLoginIdTaken(email, exceptId) {
  const key = String(email || '').trim().toLowerCase()
  return db.dealers.some((d) => d.id !== exceptId && d.email.toLowerCase() === key)
}

export function addDealer(payload, operator) {
  if (isLoginIdTaken(payload.email)) return { ok: false, error: 'EMAIL_DUPLICATED' }
  const dealer = {
    id: uid('DL'),
    status: 'ACTIVE',
    password: genPassword(),
    locked: false,
    loginFailCount: 0,
    createdAt: serverNow.value,
    remark: '',
    ...payload
  }
  db.dealers.push(dealer)
  // 建檔同時開通對外站帳號，登入密碼僅以 Email 寄至登入帳號
  sendAccountEmail(dealer, EMAIL_TYPE.ACCOUNT_ISSUED, dealer.password)
  audit('dealer.add', { dealerId: dealer.id, operator })
  return { ok: true, dealer }
}

export function updateDealer(id, patch, operator) {
  const d = dealerById(id)
  if (!d) return { ok: false, error: 'NOT_FOUND' }
  if (patch.email && isLoginIdTaken(patch.email, id)) return { ok: false, error: 'EMAIL_DUPLICATED' }
  // 登入帳號（Email）變更：新 Email 即刻生效、舊 Email 立即失效；
  // 密碼不變、鎖定狀態與登入錯誤次數也不歸零（解鎖是獨立操作）。稽核留存前後值
  if (patch.email && patch.email !== d.email) {
    audit('dealer.loginIdChange', { dealerId: id, before: d.email, after: patch.email, operator })
  }
  Object.assign(d, patch)
  audit('dealer.update', { dealerId: id, operator })
  return { ok: true }
}

export function setDealerStatus(id, active, operator) {
  const d = dealerById(id)
  if (!d) return { ok: false, error: 'NOT_FOUND' }
  d.status = active ? 'ACTIVE' : 'INACTIVE'
  audit(active ? 'dealer.enable' : 'dealer.disable', { dealerId: id, operator })
  return { ok: true }
}

// 重設密碼：舊密碼即刻失效、新密碼僅寄至登入 Email。本操作不解除帳號鎖定
export function resetDealerPassword(id, operator) {
  const d = dealerById(id)
  if (!d) return { ok: false, error: 'NOT_FOUND' }
  d.password = genPassword()
  sendAccountEmail(d, EMAIL_TYPE.PASSWORD_RESET, d.password)
  audit('dealer.resetPassword', { dealerId: id, operator, to: d.email })
  return { ok: true }
}

// 解鎖：僅在鎖定中可用，錯誤次數一併歸零。系統不提供自動解鎖
export function unlockDealer(id, operator) {
  const d = dealerById(id)
  if (!d) return { ok: false, error: 'NOT_FOUND' }
  if (!d.locked) return { ok: false, error: 'NOT_LOCKED' }
  d.locked = false
  d.loginFailCount = 0
  audit('dealer.unlock', { dealerId: id, operator })
  return { ok: true }
}

// ── 對外站登入 ────────────────────────────────────────
// 連續錯誤達 5 次自動鎖定；鎖定後不論帳密正確與否一律拒絕；成功登入錯誤次數歸零
export function dealerLogin(email, password) {
  const d = db.dealers.find((x) => x.email.toLowerCase() === String(email || '').trim().toLowerCase())
  if (d && d.locked) return { ok: false, error: 'LOCKED' }
  if (!d || d.password !== password) {
    if (d) {
      d.loginFailCount = (d.loginFailCount || 0) + 1
      if (d.loginFailCount >= LOGIN_FAIL_LIMIT) {
        d.locked = true
        audit('dealer.lock', { dealerId: d.id, reason: 'LOGIN_FAIL_LIMIT' })
        return { ok: false, error: 'LOCKED_NOW' }
      }
    }
    return { ok: false, error: 'BAD_CREDENTIAL' }
  }
  if (d.status !== 'ACTIVE') return { ok: false, error: 'DISABLED' }
  d.loginFailCount = 0
  return { ok: true, dealer: d }
}

// ── 自動處理：開始、開始日通知、自動催投、結標 ─────────────────
export function runScheduler() {
  const now = serverNow.value
  let changed = false

  // ① 待開始 → 投標中（開始日 00:00）
  db.rounds.forEach((r) => {
    if (r.status === ROUND_STATUS.PENDING && now >= roundStartAt(r)) {
      openRound(r)
      audit('auction.start', { roundId: r.id })
      changed = true
    }
  })

  // ② 開始日 09:00 發出上架通知（依批次歸組）／加價拍賣通知
  db.batches.forEach((b) => {
    if (!b.noticeSent && now >= startNoticeAt(b.startDate)) {
      sendBatchNotice(b)
      changed = true
    }
  })
  db.rounds.forEach((r) => {
    if (r.round > 1 && r.status === ROUND_STATUS.OPEN && !r.noticeSent && now >= startNoticeAt(r.startDate)) {
      r.noticeSent = true
      notify(r.inviteeIds, NOTICE_TYPE.EXTRA_ROUND_INVITE, r)
      changed = true
    }
  })

  // ③ 自動催投（結標日前 2 天 09:00，同一輪限 1 次）④ 截止 → 已結標
  db.rounds.forEach((r) => {
    if (r.status !== ROUND_STATUS.OPEN) return
    if (!r.autoUrgeSent && now >= autoUrgeAt(r.endDate)) {
      const targets = unbidInvitees(r.id)
      if (targets.length) notify(targets, NOTICE_TYPE.CLOSING_SOON, r)
      r.urgeLogs.push({ by: null, auto: true, at: now, targets })
      r.autoUrgeSent = true
      changed = true
    }
    if (now > roundEndAt(r)) {
      r.status = ROUND_STATUS.CLOSED
      const v = vehicleById(r.vehicleId)
      if (v && v.status === VEHICLE_STATUS.IN_AUCTION) v.status = VEHICLE_STATUS.CLOSED
      audit('auction.close', { roundId: r.id })
      changed = true
    }
  })
  return changed
}

// ── 對外站列表 ────────────────────────────────────────
// 拍賣列表：投標中、且該廠商在本輪邀請名單內（加價輪只對被勾選的廠商存在；待開始一律不呈現）
export function dealerOpenAuctions(dealerId) {
  return db.rounds
    .filter((r) => canDealerSeeRound(r.id, dealerId))
    .map((r) => ({ round: r, vehicle: vehicleById(r.vehicleId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.IN_AUCTION)
    .sort((a, b) => roundEndAt(a.round) - roundEndAt(b.round))
}

// 已得標：得標、尚未結清，得標時間由近到遠
export function dealerWonList(dealerId) {
  return db.awards
    .filter((a) => a.dealerId === dealerId && !a.settled)
    .map((a) => ({ award: a, vehicle: vehicleById(a.vehicleId), round: roundById(a.roundId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.AWARDED)
    .sort((a, b) => b.award.at - a.award.at)
}
