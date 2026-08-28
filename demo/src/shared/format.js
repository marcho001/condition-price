import dayjs from 'dayjs'

export function yen(n) {
  if (n === null || n === undefined || n === '') return '—'
  return Number(n).toLocaleString('ja-JP')
}

export function yenJa(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `${yen(n)}円`
}

export function km(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `${Number(n).toLocaleString('ja-JP')} km`
}

export function na(v) {
  if (v === null || v === undefined || v === '') return '—'
  return v
}

export function fmtDate(v) {
  if (!v) return '—'
  return dayjs(v).format('YYYY/MM/DD')
}

export function fmtMonth(v) {
  if (!v) return '—'
  return dayjs(v).format('YYYY/MM')
}

export function fmtDateTime(v) {
  if (!v) return '—'
  return dayjs(v).format('YYYY/MM/DD HH:mm')
}

// 拍賣結束日為「到日」精度，實際截止時刻為當日 23:59:59（JST）
export function endOfDay(dateStr) {
  return dayjs(dateStr).endOf('day').valueOf()
}

export function startOfDay(dateStr) {
  return dayjs(dateStr).startOf('day').valueOf()
}

export function today() {
  return dayjs().format('YYYY-MM-DD')
}

export function addDays(dateStr, n) {
  return dayjs(dateStr).add(n, 'day').format('YYYY-MM-DD')
}

const pad = (n) => String(n).padStart(2, '0')

// 剩餘時間拆解，供倒數元件使用
export function remain(ms) {
  const over = ms <= 0
  const t = Math.max(0, ms)
  const d = Math.floor(t / 86400000)
  const h = Math.floor((t % 86400000) / 3600000)
  const m = Math.floor((t % 3600000) / 60000)
  const s = Math.floor((t % 60000) / 1000)
  return {
    over,
    d,
    h,
    m,
    s,
    hhmmss: `${pad(h)}:${pad(m)}:${pad(s)}`,
    // 24 小時內視為緊急
    urgent: !over && t < 86400000,
    critical: !over && t < 3600000
  }
}

export function remainTextJa(ms) {
  const r = remain(ms)
  if (r.over) return '締切'
  return r.d > 0 ? `${r.d}日 ${r.hhmmss}` : r.hhmmss
}

export function remainTextZh(ms) {
  const r = remain(ms)
  if (r.over) return '已截止'
  return r.d > 0 ? `${r.d} 天 ${r.hhmmss}` : r.hhmmss
}

// 金額輸入：只留數字，自動去逗號
export function toAmount(input) {
  const digits = String(input ?? '').replace(/[^\d]/g, '')
  return digits === '' ? null : Number(digits)
}

export function groupAmountInput(input) {
  const n = toAmount(input)
  return n === null ? '' : n.toLocaleString('en-US')
}
