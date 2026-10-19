<script setup>
// 三個列表共用的拍賣卡片（規格 5.1、七；Figma：Auction-Card）。
// 依 scope 切換顯示內容：拍賣列表／我的拍賣顯示倒數、期間與出價；已得標顯示成交日與成交價。
// 兩者的列表 API 回傳欄位不同（OpenAPI 的 AuctionCard、WonCard schema），車輛欄位皆攤平在第一層
import { computed } from 'vue'
import CountdownBar from './CountdownBar.vue'
import StatusBadge from './StatusBadge.vue'
import carPlaceholder from '@/assets/car-placeholder.svg'
import { LIST_SCOPE } from '@/api/auction'
import { useCountdown } from '@/composables/useCountdown'
import { useDictStore } from '@/stores/dict'
import { isExtraRound, myBidAmountOf } from '@/utils/auction'
import { formatDate, formatNumber, formatYen } from '@/utils/format'

const props = defineProps({
  auction: { type: Object, required: true },
  scope: { type: String, required: true },
})
const emit = defineEmits(['open', 'bid', 'cancel'])

const isWon = computed(() => props.scope === LIST_SCOPE.WON)
const { isClosed, isEndingSoon } = useCountdown(() => props.auction.endAt)
const hasBid = computed(() => myBidAmountOf(props.auction) !== null)
const { colorLabel } = useDictStore()
</script>

<template>
  <article
    class="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
    @click="emit('open')"
  >
    <!-- 照片：無照片時顯示車輛示意圖 -->
    <div class="relative h-[200px] bg-placeholder md:h-[220px]">
      <img v-if="auction.coverUrl" :src="auction.coverUrl" alt="" class="size-full object-cover" />
      <img v-else :src="carPlaceholder" alt="" class="absolute top-1/2 left-1/2 h-[146px] w-[200px] -translate-1/2" />

      <div class="absolute top-4 left-4 flex gap-2">
        <StatusBadge v-if="!isWon && isEndingSoon" tone="warning">{{ $t('card.endingSoon') }}</StatusBadge>
        <StatusBadge v-if="isExtraRound(auction)">{{ $t('card.extraRound') }}</StatusBadge>
      </div>
      <span v-if="isWon" class="won-stamp">{{ $t('won.seal') }}</span>
    </div>

    <CountdownBar v-if="!isWon" :end-time="auction.endAt" />

    <div class="flex flex-1 flex-col gap-4 p-4 md:gap-5 md:p-5">
      <!-- 標題只放品牌，車系獨立一行避免被截斷；車台番号加標籤、字級較小，與車系區隔（Figma：Title-Block） -->
      <div class="flex flex-col gap-1 md:gap-2">
        <h3 class="truncate text-base font-semibold text-ink md:text-xl">{{ auction.makeName }}</h3>
        <p class="truncate text-sm text-ink-regular">{{ auction.seriesName }}</p>
        <p class="flex gap-2 text-xs text-ink-hint">
          <span class="shrink-0">{{ $t('card.vin') }}</span>
          <span class="truncate">{{ auction.vin ?? '—' }}</span>
        </p>
      </div>

      <dl class="grid grid-cols-3 border-y border-divider py-3">
        <div class="flex flex-col gap-1">
          <dt class="text-xs text-ink-hint">{{ $t('card.year') }}</dt>
          <dd class="text-sm text-ink">{{ auction.carYear ?? '—' }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-xs text-ink-hint">{{ $t('card.mileage') }}</dt>
          <dd class="text-sm text-ink">{{ formatNumber(auction.mileage) }} km</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="text-xs text-ink-hint">{{ $t('card.color') }}</dt>
          <dd class="truncate text-sm text-ink">{{ colorLabel(auction.color) ?? '—' }}</dd>
        </div>
      </dl>

      <dl class="flex flex-col gap-3 text-sm">
        <template v-if="isWon">
          <div class="meta-row">
            <dt>{{ $t('won.wonAt') }}</dt>
            <dd>{{ formatDate(auction.dealDate) }}</dd>
          </div>
          <div class="meta-row">
            <dt>{{ $t('won.amount') }}</dt>
            <dd class="!text-xl !font-semibold !text-success">{{ formatYen(auction.dealPrice) }}</dd>
          </div>
        </template>
        <template v-else>
          <div class="meta-row">
            <dt>{{ $t('card.period') }}</dt>
            <dd>{{ formatDate(auction.startDate) }} ~ {{ formatDate(auction.endDate) }}</dd>
          </div>
          <!-- 第一輪不顯示起標價（規格 二） -->
          <div v-if="isExtraRound(auction)" class="meta-row">
            <dt>{{ $t('card.startPrice') }}</dt>
            <dd>{{ formatYen(auction.startPrice) }}</dd>
          </div>
          <div class="meta-row">
            <dt>{{ $t('card.myBid') }}</dt>
            <dd class="!text-xl !font-semibold">
              {{ hasBid ? formatYen(auction.myBidAmount) : $t('card.notBidYet') }}
            </dd>
          </div>
        </template>
      </dl>

      <div v-if="!isWon && !isClosed" class="mt-auto flex gap-3" @click.stop>
        <!-- 出品一覽與入札中皆可取消，僅限本輪已出價的項目 -->
        <el-button v-if="hasBid" class="card-btn !w-24" @click="emit('cancel')">
          {{ $t('card.cancel') }}
        </el-button>
        <el-button type="primary" class="card-btn flex-1" @click="emit('bid')">
          {{ $t(hasBid ? 'card.editBid' : 'card.bid') }}
        </el-button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.meta-row dt {
  color: var(--color-ink-hint);
  white-space: nowrap;
}
.meta-row dd {
  color: var(--color-ink);
  font-weight: 500;
  text-align: right;
}
.card-btn {
  height: 44px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
/* 落札印章（Figma 為向量圖，待設計提供 SVG 後可替換） */
.won-stamp {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border: 3px solid var(--color-success);
  border-radius: 50%;
  background: rgb(255 255 255 / 0.85);
  color: var(--color-success);
  font-size: 28px;
  font-weight: 600;
  transform: rotate(-15deg);
}
</style>
