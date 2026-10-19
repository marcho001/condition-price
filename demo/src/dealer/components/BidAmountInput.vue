<script setup>
// 出價金額輸入＋クイック加算。詳細頁與卡片的出價彈窗共用（規格 6.2）
import { computed, ref } from 'vue'
import { formatNumber, parseAmount } from '@/utils/format'

defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  // 前端驗證訊息（未填、未達下限），顯示在輸入欄下方；API 錯誤由呼叫端以 toast 呈現
  error: { type: String, default: '' },
  // PC 詳細頁右側面板用：縮小間距與字級，讓整個面板盡量不必捲動
  compact: { type: Boolean, default: false },
})
const amount = defineModel({ type: Number, default: null })

const QUICK_ADD_STEPS = [100_000, 500_000, 1_000_000] // +10万／+50万／+100万
const lastQuickStep = ref(null)

// 顯示千分位；輸入時自動去除逗號與非數字
const displayValue = computed(() => (amount.value === null ? '' : formatNumber(amount.value)))

function onInput(event) {
  amount.value = parseAmount(event.target.value)
  lastQuickStep.value = null
  // 格式化後游標會跑到最後，直接覆寫欄位文字讓畫面與數值一致
  event.target.value = displayValue.value
}

// 輸入負數時，blur 當下自動改為 0（規格 6.2）
function onBlur() {
  if (amount.value !== null && amount.value < 0) amount.value = 0
}

function quickAdd(step) {
  amount.value = Math.max(0, amount.value ?? 0) + step
  lastQuickStep.value = step
}
</script>

<template>
  <div class="flex flex-col gap-6" :class="{ 'lg:gap-4': compact }">
    <div class="flex flex-col gap-4" :class="{ 'lg:gap-3': compact }">
      <div class="flex flex-col gap-1">
        <p class="text-sm font-semibold text-ink">{{ label }}</p>
        <p v-if="hint" class="text-xs text-ink-hint">{{ hint }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2 border-b pb-2" :class="error ? 'border-danger' : 'border-brand'">
          <input
            :value="displayValue"
            inputmode="numeric"
            :placeholder="$t('bid.placeholder')"
            class="min-w-0 flex-1 bg-transparent text-[32px] leading-[38px] font-bold text-brand outline-none placeholder:text-disabled"
            :class="{ 'lg:text-[28px] lg:leading-[34px]': compact }"
            @input="onInput"
            @blur="onBlur"
          />
          <span class="text-sm text-ink">{{ $t('common.yen') }}</span>
        </label>
        <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-3" :class="{ 'lg:gap-2': compact }">
      <p class="text-sm font-semibold text-ink">{{ $t('bid.quick') }}</p>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="step in QUICK_ADD_STEPS"
          :key="step"
          type="button"
          class="h-10 rounded-md border bg-white text-sm transition-colors"
          :class="[
            lastQuickStep === step ? 'border-brand text-brand' : 'border-line text-ink hover:border-brand',
            { 'lg:h-9': compact },
          ]"
          @click="quickAdd(step)"
        >
          +{{ step / 10_000 }}万
        </button>
      </div>
    </div>
  </div>
</template>
