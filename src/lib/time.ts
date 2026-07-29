const pad = (n: number) => String(n).padStart(2, '0')

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days} 天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 走本地時區，與 <input type="datetime-local"> 的行為一致 */
export function toDateTimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDateTimeLocal(value: string): number {
  const [date, time] = value.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime()
}
