<template>
  <div class="board" :class="[tier, size]">
    <span class="lbl">{{ over ? t('card.closed') : t('card.deadline') }}</span>
    <span class="val fig">{{ text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roundRemaining } from '@/shared/engine.js'
import { remain, remainTextJa } from '@/shared/format.js'

const props = defineProps({
  round: { type: Object, required: true },
  size: { type: String, default: 'sm' } // sm | lg
})

const { t } = useI18n()
const ms = computed(() => roundRemaining(props.round))
const r = computed(() => remain(ms.value))
const over = computed(() => r.value.over)
const text = computed(() => (over.value ? '—' : remainTextJa(ms.value)))
const tier = computed(() =>
  r.value.over ? 'over' : r.value.critical ? 'critical' : r.value.urgent ? 'urgent' : 'normal'
)
</script>

<style scoped>
/* オークション会場の締切ボードを模したストリップ */
.board {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: var(--ink);
  color: #eef1ec;
  padding: 7px 12px;
}

.board.urgent { background: var(--amber); }
.board.critical { background: var(--seal); }
.board.over { background: #6e7873; }

.lbl {
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: rgba(238, 241, 236, 0.72);
  flex: none;
}

.val {
  font-size: 15px;
  letter-spacing: 0.06em;
  margin-left: auto;
}

.board.lg { padding: 12px 16px; border-radius: var(--r-md); }
.board.lg .lbl { font-size: 11px; }
.board.lg .val { font-size: 26px; letter-spacing: 0.05em; font-weight: 600; }
</style>
