<script setup>
// 拍賣列表／我的拍賣／已得標，三者共用此頁，以 scope 區分（規格 5、七）
import { InfoFilled, Loading } from '@element-plus/icons-vue'
import { computed, ref, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import filterIcon from '@/assets/icon-filter.svg'
import AuctionCard from '@/components/AuctionCard.vue'
import BidDialog from '@/components/BidDialog.vue'
import CancelBidDialog from '@/components/CancelBidDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import FilterDialog from '@/components/FilterDialog.vue'
import QuickFilterChips from '@/components/QuickFilterChips.vue'
import { getListByScope, LIST_SCOPE } from '@/api/auction'
import { BID_RESULT, useBidActions } from '@/composables/useBidActions'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { createEmptyFilters, useListFiltersStore } from '@/stores/listFilters'

const props = defineProps({
  scope: { type: String, required: true },
})

const router = useRouter()

// 各列表的標題與空狀態文案
const PAGE_TEXT = {
  [LIST_SCOPE.OPEN]: { title: 'list.title', empty: 'list.empty', emptyDesc: 'list.emptyDesc' },
  [LIST_SCOPE.MY_BIDS]: { title: 'mybids.title', empty: 'mybids.empty', emptyDesc: 'mybids.emptyDesc' },
  [LIST_SCOPE.WON]: { title: 'won.title', empty: 'won.empty', emptyDesc: 'won.emptyDesc' },
}
const text = computed(() => PAGE_TEXT[props.scope])
const isWon = computed(() => props.scope === LIST_SCOPE.WON)

// ---- 篩選 ----
// 三個列表各自保留條件，存在 store 裡；切換列表後回來仍是原本的條件（規格 5.2）
const scopeState = useListFiltersStore().forScope(props.scope)
const filters = scopeState.filters
const quickFilter = toRef(scopeState, 'quickFilter') // 已得標不顯示（規格 5.2）
const filterVisible = ref(false)
// 年份、里程的起迄各算一項條件
const activeFilterCount = computed(
  () =>
    [
      filters.vin,
      filters.makeIds.length,
      filters.carYearFrom || filters.carYearTo,
      filters.mileageFrom !== '' || filters.mileageTo !== '',
    ].filter(Boolean).length,
)

function applyFilters(next) {
  Object.assign(filters, next)
}

function clearFilters() {
  Object.assign(filters, createEmptyFilters())
  quickFilter.value = null
}

// 年份選擇器按 clear 時值為 null，需與空字串一樣視為未填，否則 Number(null) 會送出 0
const toNumber = (value) => (value === '' || value == null ? undefined : Number(value))

// ---- 列表 ----
// 三個列表各打自己的 API，篩選參數相同；已得標不傳 quickFilter（chip 不顯示）
const { list, total, loading, finished, sentinel, reset } = useInfiniteList((page) =>
  getListByScope(props.scope, {
    vin: filters.vin || undefined,
    makeIds: filters.makeIds.length ? filters.makeIds : undefined,
    carYearFrom: toNumber(filters.carYearFrom),
    carYearTo: toNumber(filters.carYearTo),
    mileageFrom: toNumber(filters.mileageFrom),
    mileageTo: toNumber(filters.mileageTo),
    quickFilter: isWon.value ? undefined : (quickFilter.value ?? undefined),
    ...page,
  }),
)

// 套用篩選或切換 chip 後，從第一批重新載入並回到頂端（規格 5.2）
watch([filters, quickFilter], () => {
  window.scrollTo({ top: 0 })
  reset()
})
reset()

// 已得標有自己的詳細頁；拍賣列表與我的拍賣共用投標中的詳細頁，以 from 記錄返回目標
function openDetail(auction) {
  if (isWon.value) {
    router.push({ name: 'won-detail', params: { roundId: auction.roundId } })
  } else {
    router.push({ name: 'auction-detail', params: { roundId: auction.roundId }, query: { from: props.scope } })
  }
}

// ---- 卡片上的出價／放棄出價 ----
const bidTarget = ref(null)
const bidVisible = ref(false)
const cancelTarget = ref(null)
const cancelVisible = ref(false)
const { submitting, withdrawBid } = useBidActions()

function openBid(auction) {
  bidTarget.value = auction
  bidVisible.value = true
}

function openCancel(auction) {
  cancelTarget.value = auction
  cancelVisible.value = true
}

// 成功、或拍賣已無法出價時，關閉彈窗並重新載入列表；其餘失敗停在彈窗
async function confirmCancel() {
  const result = await withdrawBid(cancelTarget.value)
  if (result === BID_RESULT.FAILED) return
  cancelVisible.value = false
  reset()
}
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pb-16 md:gap-8 ">
    <!-- 標題列：PC 左右排列，手機上下排列；固定在頂部導覽列下方，捲動時只有卡片移動 -->
    <div
      class="sticky top-12 z-10 -mx-4 flex flex-col gap-6 bg-page px-4 py-3 md:top-16 md:flex-row md:items-center md:justify-between md:py-4"
    >
      <div class="flex flex-col gap-1 md:gap-2">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-black text-ink md:text-[28px]">{{ $t(text.title) }}</h1>
          <span
            class="rounded px-2 py-0.5 text-xs font-bold md:text-sm"
            :class="isWon ? 'bg-success/10 text-success' : 'bg-brand/10 text-brand'"
          >
            {{ $t('list.countOnline', { n: total }) }}
          </span>
        </div>
        <p v-if="!isWon" class="text-sm text-ink-hint">{{ $t('list.sortNote') }}</p>
      </div>

      <div class="flex items-center justify-between gap-3 md:justify-end">
        <QuickFilterChips v-if="!isWon" v-model="quickFilter" />
        <el-badge :value="activeFilterCount" :hidden="!activeFilterCount" class="ml-auto md:ml-0">
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-md border border-line bg-white md:h-10 md:w-12"
            :aria-label="$t('list.filter')"
            @click="filterVisible = true"
          >
            <img :src="filterIcon" alt="" class="size-4" />
          </button>
        </el-badge>
      </div>
    </div>

    <p v-if="isWon" class="flex items-center gap-1 rounded-lg bg-white px-4 py-3 text-sm text-ink-regular">
      <el-icon :size="14"><InfoFilled /></el-icon>
      {{ $t('won.flowNote') }}
    </p>

    <EmptyState v-if="finished && !list.length" :title="$t(text.empty)" :description="$t(text.emptyDesc)" />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      <AuctionCard
        v-for="auction in list"
        :key="auction.roundId"
        :auction="auction"
        :scope="scope"
        @open="openDetail(auction)"
        @bid="openBid(auction)"
        @cancel="openCancel(auction)"
      />
    </div>

    <!-- 無限滾動：看到此元素時載入下一頁 -->
    <div ref="sentinel" class="flex h-10 items-center justify-center">
      <el-icon v-if="loading" class="is-loading text-ink-hint" :size="20"><Loading /></el-icon>
    </div>

    <FilterDialog v-model="filterVisible" :filters="filters" @apply="applyFilters" @clear="clearFilters" />
    <BidDialog v-if="bidTarget" v-model="bidVisible" :auction="bidTarget" @done="reset" />
    <CancelBidDialog
      v-if="cancelTarget"
      v-model="cancelVisible"
      :auction="cancelTarget"
      :submitting="submitting"
      @confirm="confirmCancel"
    />
  </div>
</template>
