<script setup>
// 放棄出價的二次確認（規格 6.3）
import AmountText from './AmountText.vue'
import AppDialog from './AppDialog.vue'
import HintText from './HintText.vue'
import NoticeBox from './NoticeBox.vue'
import { formatYen } from '@/utils/format'
import { myBidAmountOf, vehicleOf } from '@/utils/auction'
import { vehicleLabel } from '@/utils/vehicle'

defineProps({
  auction: { type: Object, required: true },
  submitting: { type: Boolean, default: false }, // 送出中停用確認鈕，避免重複送出
})
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['confirm'])
</script>

<template>
  <AppDialog v-model="visible" :title="$t('cancel.confirmTitle')">
    <div class="flex flex-col gap-4">
      <NoticeBox tone="danger">
        <p class="text-sm text-ink-regular">{{ $t('cancel.amountLabel') }}</p>
        <AmountText :value="myBidAmountOf(auction)" />
        <p class="text-sm font-semibold text-ink">{{ vehicleLabel(vehicleOf(auction)) }}</p>
      </NoticeBox>
      <HintText>{{ $t('cancel.confirmBody', { amount: formatYen(myBidAmountOf(auction)) }) }}</HintText>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel.back') }}</el-button>
      <el-button type="danger" :disabled="submitting" @click="emit('confirm')">{{ $t('cancel.submit') }}</el-button>
    </template>
  </AppDialog>
</template>
