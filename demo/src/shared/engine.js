import dayjs from 'dayjs'
import { db, serverNow, uid } from './store.js'
import { endOfDay } from './format.js'
import { VEHICLE_STATUS, AWARD_METHOD, NOTICE_TYPE, EMAIL_TYPE, EDITABLE_KEYS } from './constants.js'

// ── 查詢 ─────────────────────────────────────────────
export const vehicleById = (id) => db.vehicles.find((v) => v.id === id)
export const dealerById = (id) => db.dealers.find((x) => x.id === id)
export const roundById = (id) => db.rounds.find((r) => r.id === id)

// 顯示用車輛資料：收車現況值優先，否則回落至進件值
export function vehicleView(v) {
  if (!v) return {}
  return { ...v.intake, ...stripEmpty(v.current) }
}

function stripEmpty(o) {
  const out = {}
  Object.entries(o || {}).forEach(([k, val]) => {
    if (val !== '' && val !== null && val !== undefined) out[k] = val
  })
  return out
}

export const roundsOf = (vehicleId) =>
  db.rounds.filter((r) => r.vehicleId === vehicleId).sort((a, b) => a.round - b.round)

export const latestRound = (vehicleId) => roundsOf(vehicleId).slice(-1)[0] || null

export const openRoundOf = (vehicleId) =>
  db.rounds.find((r) => r.vehicleId === vehicleId && r.status === 'OPEN') || null

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

// 該輪具出價資格的全部廠商，依金額高到低排名；未出價者排最後
export function rankingOfRound(roundId) {
  const round = roundById(roundId)
  if (!round) return []
  const rows = round.inviteeIds.map((dealerId) => {
    const b = bidOf(roundId, dealerId)
    return {
      dealerId,
      dealer: dealerById(dealerId),
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

export const awardOf = (vehicleId) => db.awards.find((a) => a.vehicleId === vehicleId) || null

export const activeDealers = () => db.dealers.filter((x) => x.status === 'ACTIVE')

// ── 通知 ─────────────────────────────────────────────
// 停用中の販売店には拍賣通知を送らない（催促も含む）。
// 既に送信済みの入札は順位に残るため、通知の停止のみが停用の効果。
function notify(dealerIds, type, vehicleId, roundId) {
  dealerIds.filter((id) => dealerById(id)?.status === 'ACTIVE').forEach((dealerId) => {
    db.notifications.push({
      id: uid('N'),
      dealerId,
      type,
      vehicleId,
      roundId,
      at: serverNow.value,
      read: false
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

export const emailsOf = (dealerId) =>
  db.emails.filter((m) => m.dealerId === dealerId).sort((a, b) => b.at - a.at)

export const allEmails = () => [...db.emails].sort((a, b) => b.at - a.at)

export const notificationsOf = (dealerId) =>
  db.notifications.filter((n) => n.dealerId === dealerId).sort((a, b) => b.at - a.at)

export const unreadCountOf = (dealerId) =>
  db.notifications.filter((n) => n.dealerId === dealerId && !n.read).length

export function markNoticeRead(id) {
  const n = db.notifications.find((x) => x.id === id)
  if (n) n.read = true
}

// ── 稽核 ─────────────────────────────────────────────
function audit(action, detail) {
  db.auditLogs.push({ id: uid('L'), action, detail, at: serverNow.value })
}

// ── 車輛管理 ──────────────────────────────────────────
export function updateVehicleFields(vehicleId, patch, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return
  Object.entries(patch).forEach(([key, next]) => {
    if (!EDITABLE_KEYS.includes(key)) return
    const before = v.current[key] ?? v.intake[key] ?? ''
    const after = next ?? ''
    if (String(before) === String(after)) return
    v.current[key] = after
    v.fieldLogs.push({ field: key, before, after, operator, at: serverNow.value })
  })
}

export function addAttachment(vehicleId, att, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return
  v.attachments.push({
    id: uid('A'),
    source: 'module',
    uploader: operator,
    uploadedAt: serverNow.value,
    ...att
  })
  audit('attachment.add', { vehicleId, name: att.name, operator })
}

export function removeAttachment(vehicleId, attId, operator) {
  const v = vehicleById(vehicleId)
  if (!v) return
  const i = v.attachments.findIndex((a) => a.id === attId)
  if (i < 0) return
  audit('attachment.remove', { vehicleId, name: v.attachments[i].name, operator })
  v.attachments.splice(i, 1)
}

// 走行距離（実測値）未入力なら排定拍賣不可
export function canSchedule(vehicle) {
  return !!(vehicle && vehicle.current && vehicle.current.mileage)
}

function autoUrgeAt(endDate) {
  return dayjs(endDate).subtract(2, 'day').hour(9).minute(0).second(0).millisecond(0).valueOf()
}

export function scheduleAuction(vehicleId, { startDate, endDate }, operator) {
  const v = vehicleById(vehicleId)
  if (!v || !canSchedule(v)) return { ok: false, error: 'MILEAGE_REQUIRED' }
  const invitees = activeDealers().map((x) => x.id)
  const now = serverNow.value
  const round = {
    id: uid('R'),
    vehicleId,
    round: 1,
    startDate,
    endDate,
    startPrice: 0,
    inviteeIds: invitees,
    status: 'OPEN',
    createdBy: operator,
    createdAt: now,
    urgeLogs: [],
    // 排定當下距結標已不足 2 天時，不再自動催投
    autoUrgeSent: autoUrgeAt(endDate) <= now
  }
  db.rounds.push(round)
  v.status = VEHICLE_STATUS.IN_AUCTION
  notify(invitees, NOTICE_TYPE.NEW_AUCTION, vehicleId, round.id)
  audit('auction.schedule', { vehicleId, roundId: round.id, operator })
  return { ok: true, round }
}

export function startExtraRound(vehicleId, { startDate, endDate, inviteeIds }, operator) {
  const prev = latestRound(vehicleId)
  if (!prev) return { ok: false, error: 'NO_PREV_ROUND' }
  const high = highestOfRound(prev.id)
  const now = serverNow.value
  const round = {
    id: uid('R'),
    vehicleId,
    round: prev.round + 1,
    startDate,
    endDate,
    startPrice: high.amount || 0,
    inviteeIds: [...inviteeIds],
    status: 'OPEN',
    createdBy: operator,
    createdAt: now,
    urgeLogs: [],
    autoUrgeSent: autoUrgeAt(endDate) <= now
  }
  db.rounds.push(round)
  vehicleById(vehicleId).status = VEHICLE_STATUS.IN_AUCTION
  notify(inviteeIds, NOTICE_TYPE.EXTRA_ROUND_INVITE, vehicleId, round.id)
  audit('auction.extraRound', { vehicleId, roundId: round.id, operator, inviteeIds })
  return { ok: true, round }
}

export function unbidInvitees(roundId) {
  const round = roundById(roundId)
  if (!round) return []
  return round.inviteeIds.filter((id) => {
    const dealer = dealerById(id)
    return dealer && dealer.status === 'ACTIVE' && !bidOf(roundId, id)
  })
}

export function sendUrge(roundId, by) {
  const round = roundById(roundId)
  if (!round) return { ok: false }
  const targets = unbidInvitees(roundId)
  notify(targets, NOTICE_TYPE.CLOSING_SOON, round.vehicleId, roundId)
  round.urgeLogs.push({ by, at: serverNow.value, targets })
  audit('auction.urge', { roundId, by, targets })
  return { ok: true, targets }
}

// ── 出價 ─────────────────────────────────────────────
export function bidFloor(round) {
  // 下限一律 ≥ 1 円。第一輪：≥ 1 円（起標價 0 元僅為顯示基準）。加價輪：必須高於起標價
  return round.round === 1 ? 1 : round.startPrice + 1
}

export function placeBid(roundId, dealerId, amount) {
  const round = roundById(roundId)
  if (!round) return { ok: false, error: 'NOT_FOUND' }
  if (round.status !== 'OPEN' || roundRemaining(round) <= 0) return { ok: false, error: 'CLOSED' }
  const dealer = dealerById(dealerId)
  if (!dealer || dealer.status !== 'ACTIVE' || !round.inviteeIds.includes(dealerId))
    return { ok: false, error: 'NOT_ELIGIBLE' }
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: 'INVALID' }
  if (amount < bidFloor(round)) return { ok: false, error: 'BELOW_FLOOR' }

  const now = serverNow.value
  const exist = bidOf(roundId, dealerId)
  if (exist) {
    exist.amount = amount
    exist.at = now
    exist.history.push({ amount, at: now })
  } else {
    db.bids.push({
      id: uid('B'),
      roundId,
      dealerId,
      amount,
      at: now,
      history: [{ amount, at: now }]
    })
  }
  audit('bid.place', { roundId, dealerId, amount })
  return { ok: true }
}

// ── 決標 ─────────────────────────────────────────────
export function canAward(roundId) {
  const high = highestOfRound(roundId)
  return high.amount !== null && high.dealerIds.length === 1
}

export function canDesignate(roundId) {
  const high = highestOfRound(roundId)
  return high.amount !== null && high.dealerIds.length > 1
}

// 成交通知（拍賣 → 貸後）：三支介接 API 中唯一由本模組主動發出的一支。
// 呼叫成功才視為已決標；失敗時訂單留在已結標、狀態不變，得標／未得標通知一律不發。
export function callDealClosedApi(payload) {
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

function finishAward(vehicleId, roundId, dealerId, amount, method, operator) {
  const round = roundById(roundId)
  const vehicle = vehicleById(vehicleId)
  const at = serverNow.value

  // 先呼叫貸後的成交通知，回應成功後才轉入已決標
  const sent = callDealClosedApi({ orderNo: vehicle.orderNo, dealerId, amount, at })
  if (!sent) {
    audit('auction.award.failed', { vehicleId, roundId, dealerId, amount, method, operator })
    return false
  }

  db.awards.push({
    vehicleId,
    roundId,
    dealerId,
    amount,
    method,
    operator,
    at,
    settled: false,
    settledAt: null
  })
  vehicle.status = VEHICLE_STATUS.AWARDED
  notify([dealerId], NOTICE_TYPE.WON, vehicleId, roundId)
  notify(
    round.inviteeIds.filter((id) => id !== dealerId),
    NOTICE_TYPE.LOST,
    vehicleId,
    roundId
  )
  audit('auction.award', { vehicleId, roundId, dealerId, amount, method, operator })
  return true
}

export function awardRound(vehicleId, roundId, operator) {
  if (!canAward(roundId)) return { ok: false, error: 'NOT_ALLOWED' }
  const high = highestOfRound(roundId)
  const ok = finishAward(vehicleId, roundId, high.dealerIds[0], high.amount, AWARD_METHOD.AWARD, operator)
  return ok ? { ok: true } : { ok: false, error: 'DEAL_API_FAILED' }
}

export function designateWinner(vehicleId, roundId, dealerId, operator) {
  const high = highestOfRound(roundId)
  if (!canDesignate(roundId) || !high.dealerIds.includes(dealerId))
    return { ok: false, error: 'NOT_ALLOWED' }
  const ok = finishAward(vehicleId, roundId, dealerId, high.amount, AWARD_METHOD.DESIGNATE, operator)
  return ok ? { ok: true } : { ok: false, error: 'DEAL_API_FAILED' }
}

// ── 與貸後的介接（入向兩支，須冪等；本模組不提供對應的手動按鈕）────────
// 收車通知：貸後收車後帶 orderNo 呼叫，本模組依 orderNo 取進件資料建立待排定拍賣的車輛
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

  const exist = db.vehicles.find((v) => v.orderNo === orderNo)
  if (exist) {
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
    status: VEHICLE_STATUS.PENDING_SCHEDULE
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

  const vehicle = db.vehicles.find((v) => v.orderNo === orderNo)
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

// ── 廠商管理 ──────────────────────────────────────────
export const LOGIN_FAIL_LIMIT = 5

function genPassword() {
  return `xs${Math.random().toString(36).slice(2, 8)}`
}

export function addDealer(payload, operator) {
  const dealer = {
    id: uid('DL'),
    status: 'ACTIVE',
    password: genPassword(),
    locked: false,
    loginFailCount: 0,
    createdAt: serverNow.value,
    ...payload
  }
  db.dealers.push(dealer)
  // 建檔同時開通對外站帳號，初始密碼僅以 Email 寄至登入帳號
  sendAccountEmail(dealer, EMAIL_TYPE.ACCOUNT_ISSUED, dealer.password)
  audit('dealer.add', { dealerId: dealer.id, operator })
  return dealer
}

export function updateDealer(id, patch, operator) {
  const d = dealerById(id)
  if (!d) return
  Object.assign(d, patch)
  audit('dealer.update', { dealerId: id, operator })
}

// 重設密碼：舊密碼即刻失效、新密碼僅寄至登入 Email。本操作不解除帳號鎖定
export function resetDealerPassword(id, operator) {
  const d = dealerById(id)
  if (!d) return null
  d.password = genPassword()
  sendAccountEmail(d, EMAIL_TYPE.PASSWORD_RESET, d.password)
  audit('dealer.resetPassword', { dealerId: id, operator })
  return d.password
}

// 解鎖：僅在鎖定中可用，錯誤次數一併歸零。系統不提供自動解鎖
export function unlockDealer(id, operator) {
  const d = dealerById(id)
  if (!d || !d.locked) return { ok: false, error: 'NOT_LOCKED' }
  d.locked = false
  d.loginFailCount = 0
  audit('dealer.unlock', { dealerId: id, operator })
  return { ok: true }
}

// ── 對外站登入 ────────────────────────────────────────
// 連續錯誤達 5 次自動鎖定；鎖定後不論帳密正確與否一律拒絕；成功登入錯誤次數歸零
export function dealerLogin(email, password) {
  const d = db.dealers.find((x) => x.email.toLowerCase() === String(email || '').toLowerCase())
  if (d && d.locked) return { ok: false, error: 'LOCKED_RETRY' }
  if (!d || d.password !== password) {
    if (d) {
      d.loginFailCount = (d.loginFailCount || 0) + 1
      if (d.loginFailCount >= LOGIN_FAIL_LIMIT) {
        d.locked = true
        audit('dealer.lock', { dealerId: d.id, reason: 'LOGIN_FAIL_LIMIT' })
        return { ok: false, error: 'LOCKED' }
      }
    }
    return { ok: false, error: 'BAD_CREDENTIAL' }
  }
  if (d.status !== 'ACTIVE') return { ok: false, error: 'DISABLED' }
  d.loginFailCount = 0
  db.dealerSession = d.id
  return { ok: true, dealer: d }
}

// ── 自動處理：結標與自動催投 ────────────────────────────
export function runScheduler() {
  const now = serverNow.value
  let changed = false
  db.rounds.forEach((r) => {
    if (r.status !== 'OPEN') return
    if (!r.autoUrgeSent && now >= autoUrgeAt(r.endDate)) {
      const targets = unbidInvitees(r.id)
      if (targets.length) notify(targets, NOTICE_TYPE.CLOSING_SOON, r.vehicleId, r.id)
      r.urgeLogs.push({ by: 'システム（自動）', at: now, targets })
      r.autoUrgeSent = true
      changed = true
    }
    if (now > roundEndAt(r)) {
      r.status = 'CLOSED'
      const v = vehicleById(r.vehicleId)
      if (v && v.status === VEHICLE_STATUS.IN_AUCTION) v.status = VEHICLE_STATUS.CLOSED
      audit('auction.close', { roundId: r.id })
      changed = true
    }
  })
  return changed
}

// ── 對外站可見範圍 ────────────────────────────────────
export function dealerOpenAuctions(dealerId) {
  return db.rounds
    .filter((r) => r.status === 'OPEN' && r.inviteeIds.includes(dealerId))
    .map((r) => ({ round: r, vehicle: vehicleById(r.vehicleId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.IN_AUCTION)
}

export function dealerWonList(dealerId) {
  return db.awards
    .filter((a) => a.dealerId === dealerId && !a.settled)
    .map((a) => ({ award: a, vehicle: vehicleById(a.vehicleId), round: roundById(a.roundId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.AWARDED)
    .sort((a, b) => b.award.at - a.award.at)
}
