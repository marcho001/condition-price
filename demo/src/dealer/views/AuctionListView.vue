<template>
  <div>
    <ListToolbar
      :title="t('list.title')"
      :sort-note="t('list.sortNote')"
      :count="filtered.length"
      :active-count="activeCount"
      @open="sheetOpen = true"
    />

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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AuctionCard from '../components/AuctionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import FilterSheet from '../components/FilterSheet.vue'
import ListToolbar from '../components/ListToolbar.vue'
import { useCardList } from '../cardList.js'
import { db } from '@/shared/store.js'
import { dealerOpenAuctions, roundRemaining } from '@/shared/engine.js'

const { t } = useI18n()

const sheetOpen = ref(false)

const rows = computed(() =>
  dealerOpenAuctions(db.dealerSession)
    // 既定の並び順：締切が近いものから（ユーザー側の並び替えは提供しない）
    .sort((a, b) => roundRemaining(a.round) - roundRemaining(b.round))
)

const { filter, filtered, visible, years, colors, activeCount, sentinel } = useCardList(rows)
</script>

<style scoped>
.sentinel { height: 1px; }
</style>
