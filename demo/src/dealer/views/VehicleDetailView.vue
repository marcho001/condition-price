<script setup>
// 車輛詳細頁，三個列表共用（規格 6.1）。投標中可出價；已得標只顯示成交資訊。
// 投標中與已得標打不同的 API，回傳的車輛資料、備考、附件格式相同
import { ArrowLeft } from '@element-plus/icons-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AttachmentList from '@/components/detail/AttachmentList.vue'
import BidPanel from '@/components/detail/BidPanel.vue'
import PhotoGallery from '@/components/detail/PhotoGallery.vue'
import VehicleSpecTable from '@/components/detail/VehicleSpecTable.vue'
import WonPanel from '@/components/detail/WonPanel.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { getAuctionDetail, getWonDetail, LIST_SCOPE } from '@/api/auction'
import { isAuctionUnavailable } from '@/api/codes'
import { useCountdown } from '@/composables/useCountdown'
import { isExtraRound } from '@/utils/auction'
import { isPhoto, vehicleTitle } from '@/utils/vehicle'

const props = defineProps({
  roundId: { type: [Number, String], required: true }, // Demo：engine 的 roundId 為字串
  won: { type: Boolean, default: false }, // true：已得標詳細
})

const route = useRoute()
const router = useRouter()

const auction = ref(null)
const { isEndingSoon } = useCountdown(() => auction.value?.endAt)

// 附件依上傳順序，照片放上方相簿，其餘（pdf）放「添付ファイル」
const photos = computed(() => auction.value.attachments.filter(isPhoto))
const otherFiles = computed(() => auction.value.attachments.filter((file) => !isPhoto(file)))

// 「一覧に戻る」回到進入時的列表
const backRoute = computed(() => {
  if (props.won) return { name: 'won' }
  return { name: route.query.from === LIST_SCOPE.MY_BIDS ? 'my-bids' : 'auction-list' }
})

// 失敗的 toast 由 request 攔截器以後端訊息顯示
async function load() {
  try {
    auction.value = await (props.won ? getWonDetail(props.roundId) : getAuctionDetail(props.roundId))
  } catch (error) {
    if (isAuctionUnavailable(error)) leaveUnavailable()
  }
}

// 出價或取消出價成功後回到進入時的列表
function backToList() {
  router.push(backRoute.value)
}

// 拍賣已無法檢視或出價（不存在、已截止、無資格、已結清）：以 replace 回到列表，按上一頁不會再回到這裡
function leaveUnavailable() {
  router.replace(backRoute.value)
}

watch(() => props.roundId, load, { immediate: true })

// 標題列固定在頂部；車名可能換行，量出實際高度讓 PC 右側出價面板固定在它下方
const titleBar = ref(null)
const titleBarHeight = ref(0)
const titleBarObserver = new ResizeObserver(([entry]) => {
  titleBarHeight.value = entry.borderBoxSize[0].blockSize
})
watch(titleBar, (el, oldEl) => {
  if (oldEl) titleBarObserver.unobserve(oldEl)
  if (el) titleBarObserver.observe(el)
})
onBeforeUnmount(() => titleBarObserver.disconnect())
</script>

<template>
  <!-- 詳細頁為白底（Figma） -->
  <div v-if="auction" class="min-h-[calc(100vh-64px)] bg-white">
    <div
      class="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 md:gap-8 "
      :style="{ '--title-bar-height': `${titleBarHeight}px` }"
    >
      <!-- 返回連結與車名固定在頂部導覽列下方，捲動時只有下方內容移動 -->
      <div ref="titleBar" class="sticky top-14 z-10 -mx-4 flex flex-col gap-3 bg-white px-4 py-3 md:top-16 md:py-4">
        <RouterLink :to="backRoute" class="flex w-fit items-center gap-1 text-sm text-brand">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t('detail.backToList') }}
        </RouterLink>
        <div class="flex flex-col gap-1 md:gap-2">
          <h1 class="text-xl font-black text-ink md:text-[28px]">{{ vehicleTitle(auction.vehicle) }}</h1>
          <p class="text-sm text-ink-hint">{{ auction.vehicle.modelName }}</p>
        </div>
      </div>

      <!-- PC：左側資料、右側出價面板（sticky）；手機：照片 → 出價面板 → 資料 -->
      <!-- 左欄用 minmax(0,1fr)：照片多時縮圖列不會把欄寬撐開（縮圖列自己橫向捲動） -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <PhotoGallery :photos="photos" class="lg:col-start-1">
          <template #badges>
            <StatusBadge v-if="!won && isEndingSoon" tone="warning">{{ $t('card.endingSoon') }}</StatusBadge>
            <StatusBadge v-if="isExtraRound(auction)">{{ $t('card.extraRound') }}</StatusBadge>
          </template>
        </PhotoGallery>

        <!-- 64px 導覽列 + 標題列 + 24px 間距；螢幕太矮放不下時面板自己捲動，頁面只捲左側 -->
        <aside
          class="lg:sticky lg:top-[calc(var(--title-bar-height)+88px)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-var(--title-bar-height)-104px)] lg:self-start lg:overflow-y-auto"
        >
          <WonPanel v-if="won" :deal-price="auction.dealPrice" :deal-date="auction.dealDate" />
          <BidPanel v-else :auction="auction" @changed="backToList" @unavailable="leaveUnavailable" />
        </aside>

        <div class="flex flex-col gap-8 lg:col-start-1">
          <section class="flex flex-col gap-4">
            <h2 class="section-title">{{ $t('detail.spec') }}</h2>
            <VehicleSpecTable :vehicle="auction.vehicle" />
          </section>

          <!-- 備註與其他附件：沒有內容時不顯示該區塊 -->
          <section v-if="auction.remark" class="flex flex-col gap-4">
            <h2 class="section-title">{{ $t('detail.remark') }}</h2>
            <p class="text-sm whitespace-pre-line text-ink">{{ auction.remark }}</p>
          </section>

          <section v-if="otherFiles.length" class="flex flex-col gap-4">
            <h2 class="section-title">{{ $t('detail.attachments') }}</h2>
            <AttachmentList :attachments="otherFiles" />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  color: var(--color-ink);
  font-size: 16px;
  font-weight: 700;
}
@media (min-width: 768px) {
  .section-title {
    font-size: 18px;
  }
}
</style>
