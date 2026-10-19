<template>
  <el-config-provider :locale="localeObj">
    <!-- Demo：以 portal 外框包住本模組畫面（正式環境由 micro-app 主應用提供選單與頂部列） -->
    <PortalLayout>
      <div v-show="!errorVisible && !isLoading" class="page_wrapper">
        <div class="van-safe-area-top"></div>
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" v-if="$route.meta?.keepAlive" :key="viewKey"></component>
          </KeepAlive>
          <component :is="Component" v-if="!$route.meta?.keepAlive" :key="viewKey"></component>
        </RouterView>
        <div class="van-safe-area-bottom"></div>
      </div>
      <div v-if="errorVisible" class="page_error">
        <!-- <VanEmpty image="error" :description="errorMsg" /> -->
      </div>
      <div v-if="isLoading" class="page_loaing">
        <!-- <VanLoading vertical>Loading...</VanLoading> -->
      </div>
    </PortalLayout>
    <DemoConsole />
  </el-config-provider>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useLanguageStore, useThemeStore } from '@/store';
import eventBus from '@/common/utils/event-bus';
import { ElConfigProvider } from 'element-plus';
import defaultSettings from '@packages/theme/settings';
import { useI18n } from 'vue-i18n';
import { usePermissionStore } from '@/store';
import { db } from '../shared/store.js';
import { startDemoSync } from '@/demo/sync';
import PortalLayout from '@/demo/PortalLayout.vue';
import DemoConsole from '@/demo/DemoConsole.vue';
const languageStore = useLanguageStore();
const settingsStore = useThemeStore();
const i18n = useI18n();
const { locale } = i18n;
watch(
  () => languageStore.language,
  (val) => {
    locale.value = val;
  },
  {
    immediate: true
  }
);
languageStore.changeLanguage(sessionStorage.getItem('language') || defaultSettings.language);
settingsStore.changeThemeColor(sessionStorage.getItem('themeColor') || defaultSettings.themeColor);
const localeObj = computed(() => languageStore.locale);
// Demo：切換角色或語系時以 key 重新掛載目前頁面
const viewKey = ref(0);
watch(
  () => languageStore.language,
  (val, oldVal) => {
    document.documentElement.lang = val === 'zhCn' ? 'zh-CN' : 'ja';
    // 部分共用元件（xFilterForm 的按鈕文案）只在建立時取一次語系，切換後重新掛載目前頁面
    if (oldVal && val !== oldVal) viewKey.value += 1;
  },
  { immediate: true }
);

// Demo：排程與背景同步（見 @/demo/sync）
startDemoSync();

// Demo：右上角切換角色後重新查詢權限（正式環境為重新登入），並重新掛載目前頁面以套用
const permissionStore = usePermissionStore();
watch(
  () => (db.internalUser?.roles || []).join(','),
  async () => {
    await permissionStore.queryPermission();
    viewKey.value += 1;
  }
);
const isLoading = ref(false);
const errorVisible = ref(false);
eventBus.$on('global-error', (payload) => {
  errorVisible.value = true;
});
eventBus.$on('global-loading:start', (payload) => {
  isLoading.value = true;
});
eventBus.$on('global-loading:end', (payload) => {
  isLoading.value = false;
});
</script>

<style lang="scss" scoped>
/* #app {} */
.page_wrapper,
.page_error,
.page_loaing {
  width: 100%;
  height: 100%;
  min-width: 1080px;
}
.page_wrapper {
  overflow-y: auto;
}
.page_error {
  padding-top: 10vh;
}
.page_loaing {
  padding-top: 20vh;
}
</style>
