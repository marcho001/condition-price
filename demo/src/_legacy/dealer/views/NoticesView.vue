<template>
  <div>
    <div class="page-head">
      <h1>{{ t('notices.title') }}</h1>
      <span v-if="unread" class="count fig">{{ t('notices.unread') }} {{ unread }}</span>
    </div>

    <!-- 種別フィルタ・本文キーワード検索・削除（AND 条件） -->
    <div class="tools card">
      <select v-model="typeFilter" class="input sel">
        <option value="">{{ t('notices.filterAll') }}</option>
        <option v-for="ty in TYPES" :key="ty" :value="ty">{{ t(`notices.${ty}.label`) }}</option>
      </select>

      <div class="search">
        <span class="ico" aria-hidden="true">🔍</span>
        <input v-model="keyword" class="input" type="search" :placeholder="t('notices.searchPh')" />
      </div>

      <button class="btn btn-danger btn-sm" :disabled="!picked.length" @click="askDelete">
        {{ t('notices.delete') }}<template v-if="picked.length"><span class="fig">（{{ picked.length }}）</span></template>
      </button>
    </div>

    <div v-if="rows.length" class="select-all">
      <label class="pick">
        <input type="checkbox" :checked="allPicked" @change="toggleAll" />
        <span>{{ allPicked ? t('notices.unselectAll') : t('notices.selectAll') }}</span>
      </label>
      <span class="hint">{{ t('notices.count', { n: rows.length }) }}</span>
    </div>

    <ul v-if="rows.length" class="list">
      <li v-for="n in rows" :key="n.id" class="item card" :class="{ unread: !n.read }">
        <!-- checkbox は独立した作用域。ここをタップしても遷移も既読化もしない -->
        <label class="pick-cell" @click.stop>
          <input type="checkbox" :value="n.id" v-model="picked" />
        </label>

        <!-- 本文ブロック：タップで既読化＋種別ごとの遷移。開閉はしない（全文表示） -->
        <button class="row" type="button" @click="open(n)">
          <span class="meta">
            <span class="dot" :class="{ on: !n.read }" aria-hidden="true" />
            <span class="tag">{{ t(`notices.${n.type}.label`) }}</span>
            <span class="time fig">{{ fmtDateTime(n.at) }}</span>
          </span>
          <span class="title">{{ n.title }}</span>
          <span class="body">{{ n.body }}</span>
        </button>
      </li>
    </ul>

    <EmptyState
      v-else-if="hasFilter"
      :title="t('notices.noMatch')"
      :desc="t('notices.noMatchDesc')"
    />
    <EmptyState v-else :title="t('notices.empty')" :desc="t('notices.emptyDesc')" />

    <!-- 削除の二次確認（件数を表示・元に戻せない） -->
    <div v-if="confirmOpen" class="cx-mask" @click.self="confirmOpen = false">
      <div class="cx card" role="dialog" aria-modal="true">
        <h3>{{ t('notices.deleteTitle') }}</h3>
        <p class="cx-n fig">{{ t('notices.deleteCount', { n: picked.length }) }}</p>
        <p class="cx-note">{{ t('notices.deleteHint') }}</p>
        <div class="cx-btns">
          <button class="btn btn-ghost" @click="confirmOpen = false">{{ t('common.back') }}</button>
          <button class="btn btn-danger" @click="doDelete">{{ t('notices.deleteSubmit') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import EmptyState from '../components/EmptyState.vue'
import { toast } from '../toast.js'
import { db } from '@/shared/store.js'
import {
  notificationsOf,
  unreadCountOf,
  markNoticeRead,
  deleteNotices,
  vehicleById,
  vehicleView,
  roundById,
  awardOf,
  canDealerSeeRound
} from '@/shared/engine.js'
import { NOTICE_TYPE } from '@/shared/constants.js'
import { fmtDate, fmtDateTime, yenJa, km } from '@/shared/format.js'

const { t } = useI18n()
const router = useRouter()

// 種別は固定列挙（現在のデータからは作らない）。5 種＝拍賣通知 1〜5
const TYPES = [
  NOTICE_TYPE.NEW_AUCTION,
  NOTICE_TYPE.EXTRA_ROUND_INVITE,
  NOTICE_TYPE.CLOSING_SOON,
  NOTICE_TYPE.WON,
  NOTICE_TYPE.LOST
]

const typeFilter = ref('')
const keyword = ref('')
const picked = ref([])
const confirmOpen = ref(false)

const unread = computed(() => unreadCountOf(db.dealerSession))
const hasFilter = computed(() => !!typeFilter.value || !!keyword.value.trim())

function carLabelOf(vehicleId) {
  const view = vehicleView(vehicleById(vehicleId))
  return `${view.makeName || ''} ${view.seriesName || ''}`.trim()
}

// 上架通知は 1 バッチ 1 通。本文に今回の出品車両を一覧で持つ（OrderNo は一切含めない）
function vehicleListOf(n) {
  const ids = n.vehicleIds || [n.vehicleId]
  return ids
    .map((id) => {
      const v = vehicleView(vehicleById(id))
      return `・${v.makeName} ${v.seriesName}（${v.carYear}年式・${v.licensingPlateNumber}・${km(v.mileage)}・${v.color}）`
    })
    .join('\n')
}

const decorated = computed(() =>
  notificationsOf(db.dealerSession).map((n) => {
    const view = vehicleView(vehicleById(n.vehicleId))
    const round = roundById(n.roundId)
    const award = awardOf(n.vehicleId)
    // 車両はメーカー＋車系＋ナンバープレートで識別する（OrderNo は対外通知に一切含めない）
    const params = {
      car: carLabelOf(n.vehicleId),
      carYear: view.carYear || '',
      plate: view.licensingPlateNumber || '',
      end: n.endDate ? fmtDate(n.endDate) : round ? fmtDate(round.endDate) : '',
      price: round ? yenJa(round.startPrice) : '',
      amount: award ? yenJa(award.amount) : '',
      count: n.count || 1,
      list: vehicleListOf(n)
    }
    return {
      ...n,
      title: t(`notices.${n.type}.title`, params),
      body: t(`notices.${n.type}.body`, params)
    }
  })
)

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return decorated.value.filter((n) => {
    if (typeFilter.value && n.type !== typeFilter.value) return false
    // 標題と本文への部分一致（大文字小文字を区別しない）
    if (kw && !`${n.title}\n${n.body}`.toLowerCase().includes(kw)) return false
    return true
  })
})

const allPicked = computed(() => rows.value.length > 0 && picked.value.length === rows.value.length)

function toggleAll() {
  picked.value = allPicked.value ? [] : rows.value.map((n) => n.id)
}

// 遷移先は通知の種別で決まる。目標に到達できないときは対応する一覧へ戻して理由を提示する
function open(n) {
  // 本文タップ＝既読（遷移の成否にかかわらず）
  if (!n.read) markNoticeRead(n.id)

  if (n.type === NOTICE_TYPE.LOST) return // 落選した出品はサイト上に存在しないため遷移しない

  if (n.type === NOTICE_TYPE.WON) {
    const award = awardOf(n.vehicleId)
    if (!award || award.settled) {
      router.push({ name: 'won' })
      toast(t('notices.goneWon'))
      return
    }
    router.push({ name: 'detail', params: { roundId: award.roundId } })
    return
  }

  // 上架・追加ラウンド・締切間近 → 該当ラウンドの車両詳細ページ
  const round = roundById(n.roundId)
  const single = (n.count || 1) === 1
  if (!single || !round || round.status !== 'OPEN' || !canDealerSeeRound(round.id, db.dealerSession)) {
    router.push({ name: 'list' })
    if (single) toast(t('notices.goneAuction'))
    return
  }
  router.push({ name: 'detail', params: { roundId: round.id } })
}

function askDelete() {
  if (picked.value.length) confirmOpen.value = true
}

function doDelete() {
  const n = deleteNotices(picked.value, db.dealerSession)
  picked.value = []
  confirmOpen.value = false
  toast(t('notices.deleteDone', { n }))
}
</script>

<style scoped>
.tools {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.tools .sel { flex: 0 0 auto; width: auto; min-width: 150px; }
.search { flex: 1; min-width: 160px; position: relative; }
.search .ico { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0.5; }
.search .input { padding-left: 30px; }
.btn-sm { padding: 9px 14px; font-size: 13.5px; flex: none; }

.select-all {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 8px;
  font-size: 12.5px;
  color: var(--ink-3);
}
.pick { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
.pick input { width: 16px; height: 16px; accent-color: var(--bid); }

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

.item { display: flex; align-items: stretch; overflow: hidden; }

/* checkbox は本文と可触領域を重ねない */
.pick-cell {
  flex: none;
  display: flex;
  align-items: flex-start;
  padding: 16px 10px 16px 14px;
  cursor: pointer;
  border-right: 1px solid var(--rule-soft);
}
.pick-cell input { width: 17px; height: 17px; accent-color: var(--bid); }

.row {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: none;
  background: none;
  padding: 13px 15px;
  cursor: pointer;
  text-align: left;
}

.meta { display: flex; align-items: center; gap: 8px; }
.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--rule);
}
.dot.on { background: var(--seal); border-color: var(--seal); }

.tag {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-2);
  background: var(--sheet);
  border-radius: 4px;
  padding: 2px 7px;
}
.time { font-size: 11.5px; color: var(--ink-3); margin-left: auto; }

.title { font-size: 14px; line-height: 1.5; }
.item.unread .title { font-weight: 600; }

/* 全文表示（開閉は提供しない） */
.body {
  font-size: 13px;
  line-height: 1.85;
  color: var(--ink-2);
  white-space: pre-wrap;
}

.cx-mask {
  position: fixed;
  inset: 0;
  z-index: 96;
  background: rgba(12, 15, 18, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.cx { width: 100%; max-width: 360px; padding: 22px 20px 18px; text-align: center; }
.cx h3 { margin: 0; font-size: 16px; font-weight: 600; }
.cx-n { margin: 10px 0 0; font-size: 24px; font-weight: 600; }
.cx-note {
  margin: 12px 0 0;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--ink-2);
  background: var(--sheet);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  text-align: left;
}
.cx-btns { display: flex; gap: 10px; margin-top: 16px; }
.cx-btns .btn { flex: 1; }
</style>
