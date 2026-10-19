<script setup>
// 出價二次確認（規格 6.2：大字顯示金額，「返回修改」與「確認出價」）
import AmountText from './AmountText.vue'
import AppDialog from './AppDialog.vue'
import HintText from './HintText.vue'
import NoticeBox from './NoticeBox.vue'
import { myBidAmountOf, vehicleOf } from '@/utils/auction'
import { vehicleLabel } from '@/utils/vehicle'

defineProps({
  auction: { type: Object, required: true },
  amount: { type: Number, default: null },
  submitting: { type: Boolean, default: false }, // 送出中停用確認鈕，避免重複送出
})
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['confirm', 'back'])
</script>

<template>
  <AppDialog v-model="visible" :title="$t(myBidAmountOf(auction) !== null ? 'bid.editTitle' : 'bid.title')">
    <div class="flex flex-col gap-4">
      <NoticeBox>
        <p class="text-sm text-ink-regular">{{ $t('bid.confirmTitle') }}</p>
        <AmountText :value="amount" />
        <p class="text-sm font-semibold text-ink">{{ vehicleLabel(vehicleOf(auction)) }}</p>
      </NoticeBox>
      <HintText>{{ $t('bid.confirmHint') }}</HintText>
    </div>
    <template #footer>
      <el-button @click="emit('back')">{{ $t('bid.backEdit') }}</el-button>
      <el-button type="primary" :disabled="submitting" @click="emit('confirm')">{{ $t('bid.submit') }}</el-button>
    </template>
  </AppDialog>
</template>
