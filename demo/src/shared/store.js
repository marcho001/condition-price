import { reactive, ref, computed, watch } from 'vue'
import { buildSeed } from './seed.js'

const KEY = 'jp-auction-demo/v1'
const CHANNEL = 'jp-auction-demo'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export const db = reactive(load() || buildSeed())

let muted = false
let bc = null
try {
  bc = new BroadcastChannel(CHANNEL)
} catch {
  bc = null
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (e) {
    console.warn('[demo] localStorage 保存に失敗しました（容量超過の可能性）', e)
  }
}

watch(
  db,
  () => {
    if (muted) return
    persist()
    bc?.postMessage('changed')
  },
  { deep: true }
)

function pullFromStorage() {
  const next = load()
  if (!next) return
  muted = true
  Object.assign(db, next)
  setTimeout(() => {
    muted = false
  }, 0)
}

// 兩個站台同時開著時，其中一邊的操作會即時反映到另一邊
bc?.addEventListener('message', pullFromStorage)
window.addEventListener('storage', (e) => {
  if (e.key === KEY) pullFromStorage()
})

export function resetDemoData() {
  const fresh = buildSeed()
  muted = true
  Object.keys(db).forEach((k) => {
    if (!(k in fresh)) delete db[k]
  })
  Object.assign(db, fresh)
  muted = false
  persist()
  bc?.postMessage('changed')
}

// ── 伺服器時間（JST）。Demo 可用時間快轉觀察截止行為 ──────────
const tick = ref(Date.now())
setInterval(() => {
  tick.value = Date.now()
}, 1000)

export const serverNow = computed(() => tick.value + (db.timeOffset || 0))

export function shiftTime(ms) {
  db.timeOffset = (db.timeOffset || 0) + ms
}

export function resetTime() {
  db.timeOffset = 0
}

export function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
