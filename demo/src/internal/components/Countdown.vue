<template>
  <span class="countdown num" :class="cls">{{ text }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roundRemaining } from '@/shared/engine.js'
import { remain, remainTextJa, remainTextZh } from '@/shared/format.js'

const props = defineProps({ round: { type: Object, required: true } })
const { locale } = useI18n()

const ms = computed(() => roundRemaining(props.round))
const r = computed(() => remain(ms.value))
const text = computed(() => (locale.value === 'zh' ? remainTextZh(ms.value) : remainTextJa(ms.value)))
const cls = computed(() => (r.value.over ? 'over' : r.value.critical ? 'critical' : r.value.urgent ? 'urgent' : ''))
</script>

<style scoped>
.countdown { font-weight: 500; }
.countdown.urgent { color: #e6a23c; }
.countdown.critical { color: #f56c6c; }
.countdown.over { color: #909399; }
</style>
