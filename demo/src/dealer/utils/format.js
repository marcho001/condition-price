import dayjs from 'dayjs'

export function formatYen(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${Number(value).toLocaleString('ja-JP')} 円`
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString('ja-JP')
}

export function formatDate(value) {
  return value ? dayjs(value).format('YYYY/MM/DD') : '—'
}

export function formatDateTime(value) {
  return value ? dayjs(value).format('YYYY/MM/DD HH:mm') : '—'
}

// 金額輸入：去除逗號與非數字，回傳整數或 null
export function parseAmount(input) {
  const digits = String(input ?? '').replace(/[^\d-]/g, '')
  if (digits === '' || digits === '-') return null
  return Number.parseInt(digits, 10)
}

// 剩餘毫秒 → { days, hours, minutes, seconds }
export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}
