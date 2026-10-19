<script setup>
// 從列表卡片直接出價：輸入金額 → 二次確認 → 送出（Figma：竞价弹窗、竞价变更弹窗）
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AmountText from './AmountText.vue'
import AppDialog from './AppDialog.vue'
import BidAmountInput from './BidAmountInput.vue'
import BidConfirmDialog from './BidConfirmDialog.vue'
import NoticeBox from './NoticeBox.vue'
import { BID_RESULT, useBidActions } from '@/composables/useBidActions'
import { useBidHint } from '@/composables/useBidHint'
import { myBidAmountOf, validateBidAmount } from '@/utils/auction'

const props = defineProps({
  auction: { type: Object, required: true },
})
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['done'])

const { t } = useI18n()
const bidHint = useBidHint()
const { submitting, placeBid } = useBidActions()

const currentAmount = computed(() => myBidAmountOf(props.auction))
const step = ref('input') // 'input' | 'confirm'
const amount = ref(null)
const amountError = ref('')

// 每次打開都從輸入步驟開始；修改出價時預帶本輪金額，未出過價則留空
// 列表頁以 v-if 掛載時 visible 已為 true，需 immediate 才會在首次打開時帶入
watch(
  visible,
  (open) => {
    if (!open) return
    step.value = 'input'
    amount.value = currentAmount.value
    amountError.value = ''
  },
  { immediate: true },
)

// 金額一改就清掉驗證訊息，等下次按「確認へ進む」再重新驗證
watch(amount, () => (amountError.value = ''))

function goConfirm() {
  const errorKey = validateBidAmount(amount.value, props.auction)
  amountError.value = errorKey ? t(errorKey) : ''
  if (!errorKey) step.value = 'confirm'
}

// 成功、或拍賣已無法出價時，關閉彈窗並由列表重新載入；其餘失敗停在確認步驟
async function submit() {
  const result = await placeBid(props.auction, amount.value)
  if (result === BID_RESULT.FAILED) return
  visible.value = false
  emit('done')
}
</script>

<template>
  <AppDialog
    :model-value="visible && step === 'input'"
    :title="$t(currentAmount !== null ? 'bid.editTitle' : 'bid.title')"
    @update:model-value="visible = $event"
  >
    <div class="flex flex-col gap-6">
      <NoticeBox v-if="currentAmount !== null">
        <p class="text-sm text-ink-regular">{{ $t('detail.myBid') }}</p>
        <AmountText :value="currentAmount" size="md" :colored="false" />
      </NoticeBox>
      <BidAmountInput v-model="amount" :label="$t('bid.amount')" :hint="bidHint(auction)" :error="amountError" />
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" @click="goConfirm">{{ $t('bid.next') }}</el-button>
    </template>
  </AppDialog>

  <BidConfirmDialog
    :model-value="visible && step === 'confirm'"
    :auction="auction"
    :amount="amount"
    :submitting="submitting"
    @update:model-value="visible = $event"
    @back="step = 'input'"
    @confirm="submit"
  />
</template>
