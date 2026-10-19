<script setup>
// 已得標的成交資訊（規格 6.1：無出價按鈕，不顯示拍賣資訊與我的出價）
import { InfoFilled } from '@element-plus/icons-vue'
import AmountText from '../AmountText.vue'
import NoticeBox from '../NoticeBox.vue'
import { formatDate } from '@/utils/format'

defineProps({
  dealPrice: { type: Number, required: true },
  dealDate: { type: String, required: true },
})
</script>

<template>
  <section class="flex flex-col gap-6 rounded-2xl border border-line bg-white p-6">
    <NoticeBox tone="success">
      <p class="text-sm text-ink-regular">{{ $t('won.amount') }}</p>
      <AmountText :value="dealPrice" />
      <p class="text-xs text-ink-hint">{{ $t('won.wonAt') }} {{ formatDate(dealDate) }}</p>
    </NoticeBox>
    <p class="flex items-start gap-1 text-sm text-ink-regular">
      <el-icon class="mt-1 shrink-0" :size="14"><InfoFilled /></el-icon>
      {{ $t('won.flowNote') }}
    </p>
  </section>
</template>
