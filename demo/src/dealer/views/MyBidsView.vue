<template>
  <div>
    <ListToolbar
      :title="t('mybids.title')"
      :sort-note="t('list.sortNote')"
      :count="filtered.length"
      :active-count="activeCount"
      @open="sheetOpen = true"
    />

    <div v-if="visible.length" class="card-grid">
      <AuctionCard v-for="row in visible" :key="row.round.id" :round="row.round" :vehicle="row.vehicle" />
    </div>
    <EmptyState v-else :title="t('mybids.empty')" :desc="t('mybids.emptyDesc')" />

    <div ref="sentinel" class="sentinel" />

    <!-- 「入札状況」は入札中一覧では適用しない（すべて入札済み） -->
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
import AuctionCard from '../components/AuctionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import FilterSheet from '../components/FilterSheet.vue'
import ListToolbar from '../components/ListToolbar.vue'
import { useCardList } from '../cardList.js'
import { db } from '@/shared/store.js'
import { dealerOpenAuctions, bidOf, roundRemaining } from '@/shared/engine.js'

const { t } = useI18n()

const sheetOpen = ref(false)

// 応札済みかつ進行中のものだけ。ラウンド締切後は一覧から外れる
const rows = computed(() =>
  dealerOpenAuctions(db.dealerSession)
    .filter((x) => bidOf(x.round.id, db.dealerSession))
    .sort((a, b) => roundRemaining(a.round) - roundRemaining(b.round))
)

const { filter, filtered, visible, years, colors, activeCount, sentinel } = useCardList(rows, {
  withBidState: false
})
</script>

<style scoped>
.sentinel { height: 1px; }
</style>
