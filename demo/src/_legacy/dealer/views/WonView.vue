<template>
  <div>
    <ListToolbar
      :title="t('won.title')"
      :count="filtered.length"
      :active-count="activeCount"
      @open="sheetOpen = true"
    />

    <template v-if="visible.length">
      <p class="flow-note">{{ t('won.flowNote') }}</p>
      <div class="card-grid">
        <WonCard v-for="row in visible" :key="row.award.roundId" :award="row.award" :vehicle="row.vehicle" />
      </div>
    </template>
    <EmptyState v-else :title="t('won.empty')" :desc="t('won.emptyDesc')" />

    <div ref="sentinel" class="sentinel" />

    <!-- 「入札状況」は落札済み一覧では適用しない -->
    <FilterSheet
      v-model="filter"
      :open="sheetOpen"
      :years="years"
      :colors="colors"
      :show-bid-state="false"
      @close="sheetOpen = false"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WonCard from '../components/WonCard.vue'
import EmptyState from '../components/EmptyState.vue'
import FilterSheet from '../components/FilterSheet.vue'
import ListToolbar from '../components/ListToolbar.vue'
import { useCardList } from '../cardList.js'
import { db } from '@/shared/store.js'
import { dealerWonList } from '@/shared/engine.js'

const { t } = useI18n()

const sheetOpen = ref(false)
const rows = computed(() => dealerWonList(db.dealerSession))

const { filter, filtered, visible, years, colors, activeCount, sentinel } = useCardList(rows, {
  withBidState: false
})
</script>

<style scoped>
.flow-note {
  margin: 0 0 14px;
  font-size: 12.5px;
  line-height: 1.9;
  color: var(--ink-3);
  background: var(--card);
  border-radius: var(--r-md);
  padding: 11px 14px;
  border-left: 3px solid var(--seal);
}
.sentinel { height: 1px; }
</style>
