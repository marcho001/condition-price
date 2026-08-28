<template>
  <div>
    <div class="page-head">
      <div>
        <h1>{{ t('list.title') }}</h1>
        <p class="sortline eyebrow">{{ t('list.sortNote') }}</p>
      </div>
      <button class="filter-btn" type="button" @click="sheetOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        {{ t('list.filter') }}
        <span v-if="activeCount" class="fig n">{{ activeCount }}</span>
      </button>
    </div>

    <p class="count fig">{{ t('list.count', { n: filtered.length }) }}</p>

    <div v-if="visible.length" class="card-grid">
      <AuctionCard v-for="row in visible" :key="row.round.id" :round="row.round" :vehicle="row.vehicle" />
    </div>

    <EmptyState v-else :title="t('list.empty')" :desc="t('list.emptyDesc')" />

    <div ref="sentinel" class="sentinel" />

    <FilterSheet
      v-model="filter"
      :open="sheetOpen"
      :years="years"
      :colors="colors"
      @close="sheetOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AuctionCard from '../components/AuctionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import FilterSheet from '../components/FilterSheet.vue'
import { db } from '@/shared/store.js'
import { dealerOpenAuctions, vehicleView, bidOf, roundRemaining } from '@/shared/engine.js'

const { t } = useI18n()

const PAGE = 6
const shown = ref(PAGE)
const sheetOpen = ref(false)
const sentinel = ref(null)
const filter = ref({ keyword: '', year: '', mileage: '', color: '', bidState: '' })

const rows = computed(() =>
  dealerOpenAuctions(db.dealerSession)
    .map((x) => ({ ...x, view: vehicleView(x.vehicle) }))
    // 既定の並び順：締切が近いものから
    .sort((a, b) => roundRemaining(a.round) - roundRemaining(b.round))
)

const years = computed(() => [...new Set(rows.value.map((r) => r.view.carYear))].sort().reverse())
const colors = computed(() => [...new Set(rows.value.map((r) => r.view.color))])

const activeCount = computed(() => Object.values(filter.value).filter(Boolean).length)

function inMileageBucket(mileage, bucket) {
  const m = Number(mileage || 0)
  if (bucket === 'u3') return m < 30000
  if (bucket === '3-6') return m >= 30000 && m < 60000
  if (bucket === '6-10') return m >= 60000 && m < 100000
  if (bucket === 'o10') return m >= 100000
  return true
}

const filtered = computed(() => {
  const f = filter.value
  return rows.value.filter((r) => {
    if (f.keyword) {
      const s = `${r.view.makeName} ${r.view.seriesName} ${r.view.modelName}`.toLowerCase()
      if (!s.includes(f.keyword.toLowerCase())) return false
    }
    if (f.year && r.view.carYear !== f.year) return false
    if (f.color && r.view.color !== f.color) return false
    if (f.mileage && !inMileageBucket(r.view.mileage, f.mileage)) return false
    if (f.bidState) {
      const has = !!bidOf(r.round.id, db.dealerSession)
      if (f.bidState === 'yes' && !has) return false
      if (f.bidState === 'no' && has) return false
    }
    return true
  })
})

const visible = computed(() => filtered.value.slice(0, shown.value))

watch(filter, () => {
  shown.value = PAGE
})

// 無限スクロール（ページャーは設けない）
let io = null
onMounted(() => {
  io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && shown.value < filtered.value.length) {
      shown.value += PAGE
    }
  })
  if (sentinel.value) io.observe(sentinel.value)
})
onUnmounted(() => io?.disconnect())
</script>

<style scoped>
.sortline { margin: 4px 0 0; }

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--rule);
  background: var(--card);
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13.5px;
  cursor: pointer;
  flex: none;
}
.filter-btn svg { width: 17px; height: 17px; }
.filter-btn .n {
  background: var(--bid);
  color: #fff;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 11px;
  padding: 0 4px;
}

.count { margin: 0 0 12px; font-size: 12px; color: var(--ink-3); }

.sentinel { height: 1px; }
</style>
