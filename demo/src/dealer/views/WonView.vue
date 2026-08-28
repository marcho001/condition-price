<template>
  <div>
    <div class="page-head">
      <h1>{{ t('won.title') }}</h1>
      <span class="count fig">{{ t('list.count', { n: rows.length }) }}</span>
    </div>

    <template v-if="rows.length">
      <p class="flow-note">{{ t('won.flowNote') }}</p>
      <div class="card-grid">
        <WonCard v-for="row in rows" :key="row.award.roundId" :award="row.award" :vehicle="row.vehicle" />
      </div>
    </template>
    <EmptyState v-else :title="t('won.empty')" :desc="t('won.emptyDesc')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import WonCard from '../components/WonCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { db } from '@/shared/store.js'
import { dealerWonList } from '@/shared/engine.js'

const { t } = useI18n()
const rows = computed(() => dealerWonList(db.dealerSession))
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
</style>
