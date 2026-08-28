<template>
  <div>
    <div class="page-head">
      <h1>{{ t('notices.title') }}</h1>
      <span v-if="unread" class="count fig">{{ t('notices.unread') }} {{ unread }}</span>
    </div>

    <ul v-if="rows.length" class="list">
      <li v-for="n in rows" :key="n.id" class="item card" :class="{ unread: !n.read }">
        <button class="row" type="button" :aria-expanded="opened === n.id" @click="toggle(n)">
          <span class="dot" :class="{ on: !n.read }" aria-hidden="true" />
          <span class="txt">
            <span class="title">{{ n.title }}</span>
            <span class="time fig">{{ fmtDateTime(n.at) }}</span>
          </span>
          <span class="chev" :class="{ up: opened === n.id }" aria-hidden="true">›</span>
        </button>

        <div v-if="opened === n.id" class="detail">
          <p class="body">{{ n.body }}</p>
          <RouterLink v-if="n.link" class="link" :to="n.link">
            {{ t('notices.openAuction') }} →
          </RouterLink>
        </div>
      </li>
    </ul>

    <EmptyState v-else :title="t('notices.empty')" :desc="t('notices.emptyDesc')" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/EmptyState.vue'
import { db } from '@/shared/store.js'
import {
  notificationsOf,
  unreadCountOf,
  markNoticeRead,
  vehicleById,
  vehicleView,
  roundById,
  awardOf
} from '@/shared/engine.js'
import { fmtDate, fmtDateTime, yenJa } from '@/shared/format.js'

const { t } = useI18n()
const opened = ref(null)

const unread = computed(() => unreadCountOf(db.dealerSession))

const rows = computed(() =>
  notificationsOf(db.dealerSession).map((n) => {
    const vehicle = vehicleById(n.vehicleId)
    const round = roundById(n.roundId)
    const view = vehicleView(vehicle)
    const car = `${view.makeName || ''} ${view.seriesName || ''}`.trim()
    const award = awardOf(n.vehicleId)
    const params = {
      car,
      order: vehicle?.orderNo || '',
      end: round ? fmtDate(round.endDate) : '',
      round: round?.round || '',
      price: round ? yenJa(round.startPrice) : '',
      amount: award ? yenJa(award.amount) : ''
    }
    return {
      ...n,
      title: t(`notices.${n.type}.title`, params),
      body: t(`notices.${n.type}.body`, params),
      // 締切済みのラウンドはリンク先を持たせない
      link:
        round && round.status === 'OPEN'
          ? { name: 'detail', params: { roundId: round.id } }
          : n.type === 'WON'
            ? { name: 'won' }
            : null
    }
  })
)

function toggle(n) {
  opened.value = opened.value === n.id ? null : n.id
  // 開いた時点で既読にする（「すべて既読」ボタンは設けない）
  if (!n.read) markNoticeRead(n.id)
}
</script>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

.item { overflow: hidden; }

.row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  border: none;
  background: none;
  padding: 14px 15px;
  cursor: pointer;
  text-align: left;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--rule);
}
.dot.on { background: var(--seal); border-color: var(--seal); }

.txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.title { font-size: 14px; line-height: 1.5; }
.item.unread .title { font-weight: 600; }
.time { font-size: 11.5px; color: var(--ink-3); }

.chev {
  flex: none;
  color: var(--ink-3);
  font-size: 20px;
  transform: rotate(90deg);
  transition: transform 0.16s ease;
}
.chev.up { transform: rotate(-90deg); }

.detail {
  padding: 0 15px 15px 34px;
  border-top: 1px solid var(--rule-soft);
  margin-top: -1px;
  padding-top: 13px;
}
.body { margin: 0; font-size: 13.5px; line-height: 1.95; color: var(--ink-2); }
.link {
  display: inline-block;
  margin-top: 11px;
  font-size: 13px;
  color: var(--bid);
  border-bottom: 1px solid currentColor;
}
</style>
