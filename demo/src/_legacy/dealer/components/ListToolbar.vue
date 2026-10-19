<template>
  <div>
    <div class="page-head">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="sortNote" class="sortline eyebrow">{{ sortNote }}</p>
      </div>
      <button class="filter-btn" type="button" @click="$emit('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        {{ t('list.filter') }}
        <span v-if="activeCount" class="fig n">{{ activeCount }}</span>
      </button>
    </div>

    <p class="count fig">{{ t('list.count', { n: count }) }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  title: { type: String, required: true },
  sortNote: { type: String, default: '' },
  count: { type: Number, default: 0 },
  activeCount: { type: Number, default: 0 }
})
defineEmits(['open'])

const { t } = useI18n()
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
</style>
