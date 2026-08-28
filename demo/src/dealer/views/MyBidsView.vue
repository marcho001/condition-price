<template>
  <div>
    <div class="page-head">
      <h1>{{ t('mybids.title') }}</h1>
      <span class="count fig">{{ t('list.count', { n: rows.length }) }}</span>
    </div>

    <div v-if="rows.length" class="card-grid">
      <AuctionCard v-for="row in rows" :key="row.round.id" :round="row.round" :vehicle="row.vehicle" />
    </div>
    <EmptyState v-else :title="t('mybids.empty')" :desc="t('mybids.emptyDesc')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AuctionCard from '../components/AuctionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { db } from '@/shared/store.js'
import { dealerOpenAuctions, bidOf, roundRemaining } from '@/shared/engine.js'

const { t } = useI18n()

// 応札済みかつ進行中のものだけ。ラウンド締切後は一覧から外れる
const rows = computed(() =>
  dealerOpenAuctions(db.dealerSession)
    .filter((x) => bidOf(x.round.id, db.dealerSession))
    .sort((a, b) => roundRemaining(a.round) - roundRemaining(b.round))
)
</script>
