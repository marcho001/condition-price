<script setup>
// 「新着出品／締切間近」可取消的單選切換按鈕（規格 5.2）：
// 點另一顆直接切換；再點 active 的那顆即取消，回到未選擇（顯示全部）
import { QUICK_FILTER } from '@/api/auction'

const selected = defineModel({ type: String, default: null })

const options = [
  { value: QUICK_FILTER.NEW, label: 'list.newArrival' },
  { value: QUICK_FILTER.ENDING_SOON, label: 'list.closingSoon' },
]

function toggle(value) {
  selected.value = selected.value === value ? null : value
}
</script>

<template>
  <div class="flex gap-2 md:gap-3">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="h-8 rounded-md border bg-white px-4 text-sm transition-colors md:h-10"
      :class="selected === option.value ? 'border-brand text-brand' : 'border-line text-ink-regular hover:border-brand'"
      :aria-pressed="selected === option.value"
      @click="toggle(option.value)"
    >
      {{ $t(option.label) }}
    </button>
  </div>
</template>
