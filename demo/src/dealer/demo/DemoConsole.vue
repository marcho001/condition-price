<script setup>
// Demo 專用的浮動控制台（正式站沒有）：
// 不必重新登入即可切換廠商、時間快轉觀察截止與通知、重置 Demo 資料、開啟內部系統
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import 'element-plus/es/components/message-box/style/css'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { tokenOf } from '@/demo/token'
import { getToken, saveLogin } from '@/utils/auth'
import { db, resetDemoData, resetTime, serverNow, shiftTime } from '../../shared/store.js'
import { runScheduler } from '../../shared/engine.js'

const HOUR = 3600 * 1000

const route = useRoute()
const open = ref(false)

const nowText = computed(() => dayjs(serverNow.value).format('YYYY/MM/DD HH:mm:ss'))
const shifted = computed(() => Boolean(db.timeOffset))

// 目前登入的廠商：token 格式為 demo:廠商 id:指紋（見 src/dealer/mock）
const currentDealerId = computed(() => {
  route.fullPath // 換頁時重新讀取 localStorage
  return String(getToken() ?? '').split(':')[1] ?? null
})
const isLoggedIn = computed(() => Boolean(currentDealerId.value) && route.name !== 'login')

// 只能切換到可登入的廠商（停用、鎖定中無法登入）
const switchable = computed(() => db.dealers.filter((d) => d.status === 'ACTIVE' && !d.locked))

// 直接寫入正式站 utils/auth.js 用的 token／dealerName，等同以該廠商重新登入
function switchTo(dealer) {
  if (dealer.id === currentDealerId.value) return
  saveLogin({ token: tokenOf(dealer), dealerName: dealer.name })
  window.location.hash = '#/auctions'
  window.location.reload()
}

function shift(ms) {
  shiftTime(ms)
  runScheduler()
}

function backToNow() {
  resetTime()
  runScheduler()
}

async function resetData() {
  try {
    await ElMessageBox.confirm('Demo データを初期状態に戻します。よろしいですか？', 'データをリセット', {
      confirmButtonText: 'リセット',
      cancelButtonText: 'キャンセル',
      type: 'warning',
    })
  } catch {
    return
  }
  resetDemoData()
  runScheduler()
}

function openInternal() {
  window.open('internal.html', '_blank')
}
</script>

<template>
  <div class="demo-console">
    <div v-if="open" class="demo-panel">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold tracking-widest text-ink-hint">DEMO CONSOLE</span>
        <button type="button" class="text-xs text-ink-hint" @click="open = false">閉じる</button>
      </div>

      <section class="flex flex-col gap-2">
        <p class="flex items-baseline justify-between text-xs text-ink-regular">
          <span>サーバー時刻（JST）</span>
          <b class="text-sm text-ink" :class="{ '!text-warning': shifted }">{{ nowText }}</b>
        </p>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" class="demo-btn" @click="shift(HOUR)">+1 時間</button>
          <button type="button" class="demo-btn" @click="shift(6 * HOUR)">+6 時間</button>
          <button type="button" class="demo-btn" @click="shift(24 * HOUR)">+1 日</button>
        </div>
        <button v-if="shifted" type="button" class="demo-btn" @click="backToNow">現在時刻に戻す</button>
      </section>

      <section v-if="isLoggedIn" class="flex flex-col gap-2">
        <p class="text-xs text-ink-regular">業者を切り替え（再ログイン不要）</p>
        <button
          v-for="dealer in switchable"
          :key="dealer.id"
          type="button"
          class="demo-btn !text-left"
          :class="{ 'is-active': dealer.id === currentDealerId }"
          @click="switchTo(dealer)"
        >
          {{ dealer.name }}
        </button>
      </section>

      <section class="flex flex-col gap-2">
        <button type="button" class="demo-btn" @click="openInternal">社内システムを開く ↗</button>
        <button type="button" class="demo-btn !text-danger" @click="resetData">Demo データをリセット</button>
      </section>
    </div>

    <button type="button" class="demo-toggle" :aria-expanded="open" @click="open = !open">DEMO</button>
  </div>
</template>

<style scoped>
.demo-console {
  position: fixed;
  right: 16px;
  bottom: 16px;
  /* 低於 Element Plus 的彈窗與抽屜（2000 起），開啟對話框或手機選單時不會擋住按鈕 */
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.demo-toggle {
  border-radius: 999px;
  background: #12151a;
  padding: 8px 16px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  box-shadow: 0 6px 18px rgb(18 21 26 / 0.24);
  cursor: pointer;
}
.demo-panel {
  display: flex;
  width: 260px;
  max-height: calc(100vh - 80px);
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  box-shadow: 0 14px 34px rgb(18 21 26 / 0.16);
}
.demo-btn {
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: #fff;
  padding: 7px 10px;
  color: var(--color-ink);
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}
.demo-btn:hover {
  background: var(--color-page);
}
.demo-btn.is-active {
  border-color: var(--color-brand);
  background: rgb(5 104 255 / 0.06);
  color: var(--color-brand);
  font-weight: 600;
}
</style>
