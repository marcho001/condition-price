<template>
  <div class="dc">
    <button class="dc-toggle" :aria-expanded="open" @click="open = !open">
      <span class="fig">DEMO</span>
    </button>
    <div v-if="open" class="dc-panel">
      <p class="dc-row">
        <span>{{ t('demo.time') }}</span>
        <b class="fig">{{ nowText }}</b>
      </p>
      <div class="dc-btns">
        <button class="btn btn-ghost sm" @click="shiftTime(3600e3)">{{ t('demo.shift1h') }}</button>
        <button class="btn btn-ghost sm" @click="shiftTime(6 * 3600e3)">{{ t('demo.shift6h') }}</button>
        <button class="btn btn-ghost sm" @click="shiftTime(24 * 3600e3)">{{ t('demo.shift1d') }}</button>
      </div>
      <button class="btn btn-quiet sm block" @click="resetTime">{{ t('demo.resetTime') }}</button>
      <hr />
      <template v-if="db.dealerSession">
        <p class="dc-label">{{ t('demo.switch') }}</p>
        <div class="dc-dealers">
          <button
            v-for="d in dealers"
            :key="d.id"
            class="dc-dealer"
            :class="{ on: d.id === db.dealerSession }"
            @click="switchTo(d.id)"
          >
            {{ d.name }}
          </button>
        </div>
        <button class="btn btn-ghost sm block" @click="logout">{{ t('demo.logout') }}</button>
      </template>
      <button class="btn btn-quiet sm block" @click="openInternal">{{ t('demo.openInternal') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { db, serverNow, shiftTime, resetTime } from '@/shared/store.js'
import { activeDealers } from '@/shared/engine.js'

const { t } = useI18n()
const router = useRouter()
const open = ref(false)
const dealers = computed(() => activeDealers())
const nowText = computed(() => dayjs(serverNow.value).format('MM/DD HH:mm:ss'))

function switchTo(id) {
  db.dealerSession = id
  router.replace({ name: 'list' })
}
function logout() {
  db.dealerSession = null
  router.replace({ name: 'login' })
}
function openInternal() {
  window.open('/internal.html', '_blank')
}
</script>

<style scoped>
.dc {
  position: fixed;
  left: 14px;
  bottom: calc(var(--nav-h) + 14px);
  z-index: 55;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

@media (min-width: 880px) {
  .dc {
    left: auto;
    right: 18px;
    bottom: 18px;
    align-items: flex-end;
  }
}

.dc-toggle {
  border: none;
  cursor: pointer;
  background: var(--ink);
  color: #eef1ec;
  border-radius: 999px;
  padding: 8px 14px;
  font-family: var(--font-fig);
  font-size: 11px;
  letter-spacing: 0.16em;
  box-shadow: 0 6px 18px rgba(18, 21, 26, 0.24);
}

.dc-panel {
  width: 232px;
  background: var(--card);
  border: 1px solid var(--rule-soft);
  border-radius: 14px;
  padding: 13px;
  box-shadow: 0 14px 34px rgba(18, 21, 26, 0.16);
}

.dc-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--ink-3);
}
.dc-row b { color: var(--ink); font-size: 13px; }

.dc-btns { display: flex; gap: 6px; margin-bottom: 6px; }
.dc-btns .btn { flex: 1; }

.btn.sm { padding: 7px 8px; font-size: 12px; font-weight: 500; border-radius: 9px; }
.btn.block { width: 100%; }

hr { border: none; border-top: 1px solid var(--rule-soft); margin: 11px 0; }

.dc-label { margin: 0 0 6px; font-size: 11px; color: var(--ink-3); }
.dc-dealers { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.dc-dealer {
  border: 1px solid var(--rule-soft);
  background: transparent;
  border-radius: 9px;
  padding: 7px 10px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.dc-dealer.on { border-color: var(--bid); color: var(--bid); background: var(--bid-soft); }
</style>
