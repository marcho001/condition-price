<script setup>
// 全站導覽（規格 三：四個入口，不設設定／帳號頁）。
// PC：頂部分頁；手機：漢堡選單（Figma：H5 车辆列表1-菜单）
import { Close, Menu, SwitchButton } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import caretDownIcon from '@/assets/icon-caret-down.svg'
import logo from '@/assets/logo.svg'
import { LIST_SCOPE } from '@/api/auction'
import { useAuthStore } from '@/stores/auth'
import { useNoticeStore } from '@/stores/notice'

const NAV_ITEMS = [
  { name: 'auction-list', label: 'nav.list' },
  { name: 'my-bids', label: 'nav.mybids' },
  { name: 'won', label: 'nav.won' },
  { name: 'notices', label: 'nav.notices', showUnread: true },
]

const route = useRoute()
const router = useRouter()

// 在詳細頁時，維持「從哪個列表進入」的分頁為選中狀態
const NAV_BY_SCOPE = { [LIST_SCOPE.OPEN]: 'auction-list', [LIST_SCOPE.MY_BIDS]: 'my-bids' }
const activeName = computed(() => {
  if (route.name === 'won-detail') return 'won'
  if (route.name === 'auction-detail') return NAV_BY_SCOPE[route.query.from] ?? 'auction-list'
  return route.name
})
const auth = useAuthStore()
const { unreadCount } = storeToRefs(useNoticeStore())
const dealerName = auth.dealerName()
const menuOpen = ref(false)

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-14 items-center justify-between bg-ink px-4 md:h-16 md:px-8">
    <RouterLink :to="{ name: 'auction-list' }" class="flex items-center gap-3">
      <img :src="logo" alt="XSTAR" class="h-[15px] w-[86px] md:h-[17.6px] md:w-[100px]" />
      <span class="hidden text-xl font-bold text-white/60 md:inline">{{ $t('brand.sub') }}</span>
    </RouterLink>

    <!-- PC 導覽 -->
    <nav class="hidden items-center gap-2 md:flex">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        v-slot="{ navigate }"
        :to="{ name: item.name }"
        custom
      >
        <button
          type="button"
          class="relative rounded-md px-4 py-2 text-sm text-white"
          :class="activeName === item.name ? 'bg-brand font-semibold' : 'hover:bg-white/10'"
          @click="navigate"
        >
          {{ $t(item.label) }}
          <span v-if="item.showUnread && unreadCount" class="unread-badge absolute -top-1 -right-2">{{ unreadCount }}</span>
        </button>
      </RouterLink>
    </nav>

    <el-dropdown class="!hidden md:!block" trigger="click" @command="logout">
      <button type="button" class="flex items-center gap-2 text-sm text-white">
        <span class="flex size-8 items-center justify-center rounded-full bg-white font-bold text-ink">{{ dealerName.charAt(0) }}</span>
        {{ dealerName }}
        <img :src="caretDownIcon" alt="" class="size-4" />
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">{{ $t('header.logout') }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 手機選單按鈕 -->
    <button type="button" class="relative text-white md:hidden" :aria-label="$t('header.menu')" @click="menuOpen = true">
      <el-icon :size="24"><Menu /></el-icon>
      <span v-if="unreadCount" class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-badge" />
    </button>
  </header>

  <!-- 手機選單 -->
  <el-drawer v-model="menuOpen" direction="ttb" size="100%" :with-header="false" class="mobile-menu">
    <div class="flex h-14 items-center justify-between bg-ink px-4">
      <img :src="logo" alt="XSTAR" class="h-[15px] w-[86px]" />
      <button type="button" class="text-white" @click="menuOpen = false">
        <el-icon :size="24"><Close /></el-icon>
      </button>
    </div>
    <div class="flex flex-col gap-8 px-4 py-8">
      <div class="flex items-center gap-2">
        <span class="flex size-12 items-center justify-center rounded-full bg-ink text-xl font-bold text-white">{{ dealerName.charAt(0) }}</span>
        <span class="text-sm text-ink">{{ dealerName }}</span>
      </div>
      <nav class="flex flex-col gap-8">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-2 text-base"
          :class="activeName === item.name ? 'font-semibold text-brand' : 'text-ink'"
          @click="menuOpen = false"
        >
          {{ $t(item.label) }}
          <span v-if="item.showUnread && unreadCount" class="unread-badge">{{ unreadCount }}</span>
        </RouterLink>
      </nav>
    </div>
    <div class="absolute inset-x-4 bottom-8">
      <el-button class="!h-12 w-full !text-danger" :icon="SwitchButton" @click="logout">{{ $t('header.logout') }}</el-button>
    </div>
  </el-drawer>
</template>

<style scoped>
.unread-badge {
  display: inline-flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  padding: 0 4px;
  background: var(--color-badge);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
</style>

<style>
.mobile-menu .el-drawer__body {
  padding: 0;
}
</style>
