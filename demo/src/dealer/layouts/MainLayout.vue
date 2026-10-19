<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { onDemoDataChanged } from '@/demo/runtime'
import { useDictStore } from '@/stores/dict'
import { useNoticeStore } from '@/stores/notice'

const noticeStore = useNoticeStore()
const dictStore = useDictStore()
onMounted(() => {
  noticeStore.refreshUnread()
  dictStore.load()
})
// Demo：共用資料變動（另一分頁、排程）時同步未讀數
const stopDemoSync = onDemoDataChanged(() => noticeStore.refreshUnread())
onBeforeUnmount(stopDemoSync)
</script>

<template>
  <AppHeader />
  <main class="min-h-[calc(100vh-64px)]">
    <!-- 以路由名稱為 key：在三個共用同一元件的列表間切換時重新建立頁面；篩選條件各自存在 store，不會因此清空 -->
    <RouterView :key="$route.name" />
  </main>
</template>
