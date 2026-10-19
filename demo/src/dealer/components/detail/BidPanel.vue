<script setup>
// 詳細頁右側的拍賣資訊與出價區（規格 6.1–6.3；Figma：Auction-Status-Card）。
// 直接在面板輸入金額 →「確認へ進む」→ 二次確認彈窗 → 送出
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BidAmountInput from '../BidAmountInput.vue'
import BidConfirmDialog from '../BidConfirmDialog.vue'
import CancelBidDialog from '../CancelBidDialog.vue'
import CountdownBar from '../CountdownBar.vue'
import NoticeBox from '../NoticeBox.vue'
import { BID_RESULT, useBidActions } from '@/composables/useBidActions'
import { useBidHint } from '@/composables/useBidHint'
import { useCountdown } from '@/composables/useCountdown'
import { isExtraRound, validateBidAmount } from '@/utils/auction'
import { formatDate, formatDateTime, formatYen } from '@/utils/format'

const props = defineProps({
  auction: { type: Object, required: true },
})
// changed：出價或放棄成功；unavailable：拍賣已截止或無出價資格
const emit = defineEmits(['changed', 'unavailable'])

const { t } = useI18n()
const bidHint = useBidHint()
const { submitting, placeBid, withdrawBid } = useBidActions()
const { isClosed } = useCountdown(() => props.auction.endAt)

// 修改出價時預帶本輪金額（規格 6.2）
const amount = ref(null)
watch(
  () => props.auction.myBid,
  (myBid) => (amount.value = myBid?.amount ?? null),
  { immediate: true },
)

// 前端驗證訊息顯示在輸入欄下方；金額一改就清掉，等下次按「確認へ進む」再重新驗證
const amountError = ref('')
watch(amount, () => (amountError.value = ''))

const confirmVisible = ref(false)
const cancelVisible = ref(false)

function goConfirm() {
  const errorKey = validateBidAmount(amount.value, props.auction)
  amountError.value = errorKey ? t(errorKey) : ''
  if (!errorKey) confirmVisible.value = true
}

const EVENT_BY_RESULT = { [BID_RESULT.SUCCESS]: 'changed', [BID_RESULT.UNAVAILABLE]: 'unavailable' }

// 失敗時停在彈窗讓使用者修改；其餘關閉彈窗並通知詳細頁
async function submit() {
  const result = await placeBid(props.auction, amount.value)
  if (result === BID_RESULT.FAILED) return
  confirmVisible.value = false
  emit(EVENT_BY_RESULT[result])
}

async function cancel() {
  const result = await withdrawBid(props.auction)
  if (result === BID_RESULT.FAILED) return
  cancelVisible.value = false
  emit(EVENT_BY_RESULT[result])
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-line bg-white">
    <CountdownBar :end-time="auction.endAt" size="lg" />

    <!-- PC 收緊間距與字級，讓面板在一般筆電螢幕內完整顯示（手機維持原尺寸） -->
    <div class="flex flex-col gap-6 px-4 py-6 md:px-6 lg:gap-4 lg:py-5">
      <dl class="flex flex-col gap-4 text-sm lg:gap-2">
        <div class="meta-row">
          <dt>{{ $t('detail.round') }}</dt>
          <dd>{{ $t(isExtraRound(auction) ? 'card.extraRound' : 'detail.firstRound') }}</dd>
        </div>
        <div class="meta-row">
          <dt>{{ $t('detail.period') }}</dt>
          <dd>{{ formatDate(auction.startDate) }} ~ {{ formatDate(auction.endDate) }}</dd>
        </div>
        <!-- 第一輪不顯示起標價（規格 二） -->
        <div v-if="isExtraRound(auction)" class="meta-row">
          <dt>{{ $t('detail.startPrice') }}</dt>
          <dd>{{ formatYen(auction.startPrice) }}</dd>
        </div>
      </dl>

      <NoticeBox class="lg:gap-1 lg:p-3">
        <p class="text-sm text-ink-regular">{{ $t('detail.myBid') }}</p>
        <p class="text-2xl font-bold text-ink lg:text-xl">
          {{ auction.myBid ? formatYen(auction.myBid.amount) : $t('card.notBidYet') }}
        </p>
        <p v-if="auction.myBid" class="text-xs text-ink-hint">
          {{ $t('detail.bidAt') }} {{ formatDateTime(auction.myBid.bidTime) }}
        </p>
      </NoticeBox>

      <template v-if="isClosed">
        <p class="text-sm text-ink-regular">{{ $t('detail.closedNote') }}</p>
        <el-button disabled class="panel-btn">{{ $t('detail.closedBtn') }}</el-button>
      </template>

      <template v-else>
        <BidAmountInput
          v-model="amount"
          :label="$t(auction.myBid ? 'bid.editTitle' : 'bid.title')"
          :hint="bidHint(auction)"
          :error="amountError"
          compact
        />
        <div class="flex flex-col gap-3 lg:gap-2">
          <el-button type="primary" class="panel-btn !font-semibold" @click="goConfirm">{{ $t('bid.next') }}</el-button>
          <!-- 放棄出價：位於出價按鈕正下方，本輪未出價時 disabled（規格 6.3） -->
          <el-tooltip :content="$t('detail.cancelBidDisabled')" :disabled="Boolean(auction.myBid)" placement="bottom">
            <span>
              <el-button class="panel-btn w-full" :disabled="!auction.myBid" @click="cancelVisible = true">
                {{ $t('detail.cancelBid') }}
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </template>
    </div>

    <BidConfirmDialog
      v-model="confirmVisible"
      :auction="auction"
      :amount="amount"
      :submitting="submitting"
      @back="confirmVisible = false"
      @confirm="submit"
    />
    <CancelBidDialog v-model="cancelVisible" :auction="auction" :submitting="submitting" @confirm="cancel" />
  </section>
</template>

<style scoped>
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.meta-row dt {
  color: var(--color-ink-hint);
}
.meta-row dd {
  color: var(--color-ink);
  font-weight: 500;
}
.panel-btn {
  height: 56px;
  margin: 0;
  font-size: 18px;
}
@media (min-width: 1024px) {
  .panel-btn {
    height: 48px;
    font-size: 16px;
  }
}
</style>
