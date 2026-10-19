<script setup>
// 大字金額＋單位（例：510,000 円），顏色跟著外層 NoticeBox 的 tone
import { formatNumber } from '@/utils/format'

defineProps({
  value: { type: Number, default: null },
  unit: { type: String, default: '円' },
  size: { type: String, default: 'lg', validator: (v) => ['md', 'lg'].includes(v) },
  colored: { type: Boolean, default: true },
})
</script>

<template>
  <p class="flex items-baseline gap-1 font-bold" :style="colored ? { color: 'var(--tone)' } : null">
    <span :class="size === 'lg' ? 'text-[32px] leading-[38px]' : 'text-2xl leading-7'">{{ formatNumber(value) }}</span>
    <span class="text-sm font-semibold">{{ unit }}</span>
  </p>
</template>
