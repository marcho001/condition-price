<template>
  <dl class="spec">
    <div v-for="f in fields" :key="f.key" class="row">
      <dt>{{ f.ja }}</dt>
      <dd :class="{ fig: isFig(f) }">{{ value(f) }}</dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue'
import { VEHICLE_FIELDS } from '@/shared/constants.js'
import { vehicleView } from '@/shared/engine.js'
import { km, fmtDate, fmtMonth, na } from '@/shared/format.js'

const props = defineProps({ vehicle: { type: Object, required: true } })

// 備考は独立したブロックで表示するため、ここでは除外する
const fields = VEHICLE_FIELDS.filter((f) => f.external && f.key !== 'remark')
const view = computed(() => vehicleView(props.vehicle))

const isFig = (f) =>
  ['carYear', 'mileage', 'vin', 'displacement', 'transferCount'].includes(f.key) ||
  f.type === 'date' ||
  f.type === 'month'

function value(f) {
  const v = view.value[f.key]
  if (f.key === 'mileage') return v ? km(v) : '—'
  if (f.type === 'date') return fmtDate(v)
  if (f.type === 'month') return fmtMonth(v)
  return na(v)
}
</script>

<style scoped>
/* 出品票の罫線グリッド */
.spec {
  margin: 0;
  border-top: 1px solid var(--rule);
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 700px) {
  .spec { grid-template-columns: 1fr 1fr; column-gap: 0; }
  .spec .row:nth-child(odd) { border-right: 1px solid var(--rule-soft); padding-right: 14px; }
  .spec .row:nth-child(even) { padding-left: 14px; }
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--rule-soft);
}

dt {
  flex: 0 0 44%;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.6;
}

dd {
  margin: 0;
  flex: 1;
  font-size: 14px;
  color: var(--ink);
  text-align: right;
  word-break: break-word;
}
</style>
