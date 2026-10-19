// Demo：共用 db 的背景變動 → 通知目前畫面重新查詢。
// 共用 db 會因其他分頁（BroadcastChannel）、排程（開始／結標／自動催投）、Demo 控制台而改變，
// 正式環境這些變化要等使用者重新查詢才看得到；Demo 為了讓兩站並排展示時即時同步，
// 於 db 變動後（debounce）發出 DB_CHANGED_EVENT，列表頁收到後就地重新查詢，
// 不重置篩選、分頁，也不關閉已開啟的彈窗。
import { watch, getCurrentScope, onScopeDispose } from 'vue';
import { db } from '../../shared/store.js';
import { runScheduler } from '../../shared/engine.js';
import eventBus from '@/common/utils/event-bus';

export const DB_CHANGED_EVENT = 'demo:db-changed';

const SCHEDULER_INTERVAL_MS = 3000;
const DEBOUNCE_MS = 400;

let silent = false;
/** 背景重新查詢期間不顯示全畫面 loading（見 @/plugins/axios） */
export const isSilentRefresh = () => silent;

let started = false;
export function startDemoSync() {
  if (started) return;
  started = true;

  // 開始日 00:00 轉投標中、09:00 發通知、自動催投、截止轉已結標 —— 由排程推進
  runScheduler();
  setInterval(runScheduler, SCHEDULER_INTERVAL_MS);

  let timer = null;
  watch(
    db,
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        silent = true;
        eventBus.$emit(DB_CHANGED_EVENT);
        // axios 的攔截器在 microtask 中執行，下一個 macrotask 再解除
        setTimeout(() => {
          silent = false;
        }, 0);
      }, DEBOUNCE_MS);
    },
    { deep: true }
  );
}

/**
 * 列表頁訂閱背景變動；於元件 setup 內呼叫，卸載時自動取消
 * @param {Function} refresh 重新查詢目前頁的函式
 */
export function onDemoDbChanged(refresh) {
  const handler = () => refresh();
  eventBus.$on(DB_CHANGED_EVENT, handler);
  // 元件卸載時解除訂閱
  if (getCurrentScope()) onScopeDispose(() => eventBus.$off(DB_CHANGED_EVENT, handler));
}
