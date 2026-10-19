<script setup>
// 通知中心（規格 8.1；Figma：お知らせ、お知らせ-删除弹窗）
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AmountText from '@/components/AmountText.vue'
import AppDialog from '@/components/AppDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import HintText from '@/components/HintText.vue'
import NoticeBox from '@/components/NoticeBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { deleteNotices, getNoticeList, markNoticeRead, NOTICE_TYPE } from '@/api/notice'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useNoticeStore } from '@/stores/notice'
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()
const router = useRouter()
const noticeStore = useNoticeStore()
const { unreadCount } = storeToRefs(noticeStore)

// 通知類型：標籤文案、顏色、點擊後轉跳到哪個列表頁（規格 8.1.2）。
// 通知不帶車輛識別（上架通知一封含多台），因此轉跳到列表頁而非詳細頁
const TYPE_CONFIG = {
  [NOTICE_TYPE.LISTED]: { label: 'notices.typeListed', tone: 'warning', target: 'auction-list' },
  [NOTICE_TYPE.EXTRA_ROUND]: { label: 'notices.typeExtraRound', tone: 'brand', target: 'auction-list' },
  [NOTICE_TYPE.DEADLINE]: { label: 'notices.typeDeadline', tone: 'warning', target: 'auction-list' },
  [NOTICE_TYPE.WON]: { label: 'notices.typeWon', tone: 'success', target: 'won' },
  [NOTICE_TYPE.LOST]: { label: 'notices.typeLost', tone: 'brand', target: null }, // 未得標不轉跳
}
const TYPE_OPTIONS = Object.values(NOTICE_TYPE)

const selectedIds = ref([]) // 勾選要刪除的通知

// ---- 篩選與搜尋（兩者 AND） ----
const type = ref('') // '' 為全部，其餘為 NOTICE_TYPE
const keyword = ref('')
const appliedKeyword = ref('')
let keywordTimer = null
watch(keyword, (value) => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => (appliedKeyword.value = value.trim()), 300)
})

const { list, total, loading, finished, sentinel, reset } = useInfiniteList((page) =>
  getNoticeList({ notifyType: type.value || undefined, keyword: appliedKeyword.value || undefined, ...page }),
)
const hasFilter = computed(() => Boolean(type.value || appliedKeyword.value))

watch([type, appliedKeyword], () => {
  selectedIds.value = []
  reset()
}, { immediate: true })

// ---- 點擊訊息本體：標記已讀＋依類型轉跳到列表頁 ----
function openNotice(notice) {
  if (notice.readFlag === 0) {
    notice.readFlag = 1
    markNoticeRead({ ids: [notice.id] }).then(noticeStore.refreshUnread)
  }
  const { target } = TYPE_CONFIG[notice.notifyType]
  if (target) router.push({ name: target })
}

// ---- 勾選與刪除（勾選區與訊息本體的點擊範圍分開，規格 8.1.3） ----
const allSelected = computed(() => list.value.length > 0 && selectedIds.value.length === list.value.length)
const someSelected = computed(() => selectedIds.value.length > 0 && !allSelected.value)

function toggleAll(checked) {
  selectedIds.value = checked ? list.value.map((n) => n.id) : []
}

const deleteVisible = ref(false)
const deleting = ref(false)

async function confirmDelete() {
  deleting.value = true
  try {
    const count = selectedIds.value.length
    await deleteNotices({ ids: selectedIds.value })
    ElMessage.success(t('notices.deleteDone', { n: count }))
    deleteVisible.value = false
    selectedIds.value = []
    reset()
    noticeStore.refreshUnread()
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-6 pb-16 md:gap-6 md:pt-10">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-black text-ink md:text-[28px]">{{ $t('notices.title') }}</h1>
        <span v-if="unreadCount" class="rounded bg-badge/10 px-2 py-0.5 text-xs font-bold text-badge md:text-sm">
          {{ $t('notices.unreadCount', { n: unreadCount }) }}
        </span>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row">
        <el-input
          v-model="keyword"
          :placeholder="$t('notices.search')"
          :prefix-icon="Search"
          clearable
          class="toolbar-input sm:!w-60"
        />
        <el-select v-model="type" :placeholder="$t('notices.filterType')" class="toolbar-input sm:!w-[196px]">
          <el-option :label="$t('notices.typeAll')" value="" />
          <el-option
            v-for="value in TYPE_OPTIONS"
            :key="value"
            :label="$t(TYPE_CONFIG[value].label)"
            :value="value"
          />
        </el-select>
      </div>
    </div>

    <div v-if="list.length" class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-checkbox
          :model-value="allSelected"
          :indeterminate="someSelected"
          border
          class="!mr-0 !h-10 !rounded-lg bg-white"
          @change="toggleAll"
        >
          {{ $t('notices.selectAll') }}
        </el-checkbox>
        <el-button class="!h-10" :disabled="!selectedIds.length" @click="deleteVisible = true">
          {{ $t('notices.delete') }}
        </el-button>
        <span v-if="selectedIds.length" class="hidden text-sm text-ink-regular sm:inline">
          {{ $t('notices.selectedCount', { n: selectedIds.length }) }}
        </span>
      </div>
      <span class="text-sm text-ink-hint">{{ $t('notices.total', { n: total }) }}</span>
    </div>

    <EmptyState
      v-if="finished && !list.length"
      :title="$t(hasFilter ? 'notices.noResult' : 'notices.empty')"
      :description="hasFilter ? '' : $t('notices.emptyDesc')"
    />

    <el-checkbox-group v-model="selectedIds" class="!flex flex-col gap-4">
      <article v-for="notice in list" :key="notice.id" class="flex overflow-hidden rounded-2xl bg-white">
        <!-- 勾選區：獨立的點擊範圍（checkbox 本身撐滿左側欄），手機上留足觸控面積 -->
        <el-checkbox :value="notice.id" :aria-label="notice.title" class="notice-check" />

        <!-- 訊息本體：點擊 = 標記已讀＋轉跳 -->
        <button
          type="button"
          class="flex min-w-0 flex-1 flex-col gap-3 py-4 pr-4 text-left md:pr-6"
          :class="{ 'cursor-default': !TYPE_CONFIG[notice.notifyType].target }"
          @click="openNotice(notice)"
        >
          <span class="flex items-center gap-3">
            <StatusBadge :tone="TYPE_CONFIG[notice.notifyType].tone">{{ $t(TYPE_CONFIG[notice.notifyType].label) }}</StatusBadge>
            <time class="text-sm text-ink-hint">{{ formatDateTime(notice.createTime) }}</time>
          </span>
          <span class="flex flex-col gap-2">
            <span class="flex items-center gap-2">
              <span v-if="notice.readFlag === 0" class="size-1.5 shrink-0 rounded-full bg-badge" :aria-label="$t('notices.unread')" />
              <span class="text-base font-semibold text-ink md:text-lg">{{ notice.title }}</span>
            </span>
            <span class="text-sm whitespace-pre-line text-ink-hint">{{ notice.content }}</span>
          </span>
        </button>
      </article>
    </el-checkbox-group>

    <div ref="sentinel" class="h-10" :class="{ 'opacity-0': !loading }" />

    <AppDialog v-model="deleteVisible" :title="$t('notices.deleteConfirmTitle')">
      <div class="flex flex-col gap-4">
        <NoticeBox tone="danger">
          <AmountText :value="selectedIds.length" :unit="$t('common.unit')" />
          <p class="text-sm font-semibold text-ink">{{ $t('notices.deleteConfirmBody', { n: selectedIds.length }) }}</p>
        </NoticeBox>
        <HintText>{{ $t('notices.deleteNote') }}</HintText>
      </div>
      <template #footer>
        <el-button @click="deleteVisible = false">{{ $t('common.back') }}</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDelete">{{ $t('notices.delete') }}</el-button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.notice-check {
  height: auto;
  align-items: flex-start;
  margin-right: 0;
  padding: 16px 8px 16px 16px;
}
@media (min-width: 768px) {
  .notice-check {
    padding: 16px 12px 16px 24px;
  }
}
.toolbar-input :deep(.el-input__wrapper),
.toolbar-input :deep(.el-select__wrapper) {
  min-height: 40px;
}
</style>
