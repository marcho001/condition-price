// Demo 專用：共用資料的排程與變更通知（正式站沒有這支，資料由後端排程處理）
import { watch } from 'vue'
import { db } from '../../shared/store.js'
import { runScheduler } from '../../shared/engine.js'

const SCHEDULER_INTERVAL_MS = 5000
const CHANGE_DEBOUNCE_MS = 400

const listeners = new Set()
let timerId = null

/**
 * 共用資料有變動時（另一個分頁的操作、排程結標、時間快轉…）呼叫 callback；回傳取消訂閱的函式。
 * 自己的操作同樣會觸發，呼叫端以「不清空畫面」的方式重新整理即可
 */
export function onDemoDataChanged(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/** 載入時與之後每隔幾秒跑一次排程（開始、上架通知、自動催投、結標） */
export function startDemoRuntime() {
  runScheduler()
  timerId ??= setInterval(runScheduler, SCHEDULER_INTERVAL_MS)

  let debounce = null
  watch(
    db,
    () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => listeners.forEach((fn) => fn()), CHANGE_DEBOUNCE_MS)
    },
    { deep: true },
  )
}
