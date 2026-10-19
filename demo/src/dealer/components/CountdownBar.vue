<script setup>
// 「締切まで 2日 21:14:56」倒數條。剩餘不到 24 小時改為橘色（Figma：Timer-Bar / Timer-Header）
import { useCountdown } from '@/composables/useCountdown'

const props = defineProps({
  endTime: { type: String, required: true },
  size: { type: String, default: 'sm', validator: (v) => ['sm', 'lg'].includes(v) },
})

const { parts, isClosed, isEndingSoon } = useCountdown(() => props.endTime)
const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
  <div
    class="flex items-center gap-2 text-white"
    :class="[
      isEndingSoon ? 'bg-warning' : 'bg-ink',
      size === 'lg' ? 'px-4 py-3 text-sm md:px-6' : 'px-5 py-2 text-xs',
    ]"
  >
    <template v-if="isClosed">
      <span class="font-medium leading-6">{{ $t('card.closed') }}</span>
    </template>
    <template v-else>
      <span class="font-medium">{{ $t('card.deadline') }}</span>
      <span class="flex items-center gap-1" :class="isEndingSoon ? 'text-warning' : 'text-ink'">
        <template v-if="parts.days > 0">
          <span class="digit" :class="size">{{ parts.days }}</span>
          <span class="text-sm text-white">{{ $t('card.days') }}</span>
        </template>
        <span class="digit" :class="size">{{ pad(parts.hours) }}</span>
        <span class="text-sm text-white">:</span>
        <span class="digit" :class="size">{{ pad(parts.minutes) }}</span>
        <span class="text-sm text-white">:</span>
        <span class="digit" :class="size">{{ pad(parts.seconds) }}</span>
      </span>
    </template>
  </div>
</template>

<style scoped>
.digit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #fff;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.digit.sm {
  min-width: 22px;
  height: 24px;
  padding: 0 2px;
  font-size: 14px;
}
.digit.lg {
  min-width: 29px;
  height: 32px;
  padding: 0 4px;
  font-size: 18px;
}
</style>
