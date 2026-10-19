// Demo：桌面版畫面以 px 排版，不使用 amfe-flexible（會改寫 html／body 字級）
// Demo：ElMessageBox 等以具名 import 使用的元件不會被自動引入樣式，先載入完整樣式
import 'element-plus/dist/index.css';
import '@/common/styles/index.scss';

import { createApp } from 'vue';
import App from './App.vue';
import pinia, { useLanguageStoreHook, useThemeStoreHook } from './store';
import router from './router';
import axios from './plugins/axios';
import eventBus from './plugins/event-bus';
import i18n from './i18n';
const languageStore = useLanguageStoreHook();
const themeStore = useThemeStoreHook();
const app = createApp(App);

app.config.performance = process.env.NODE_ENV !== 'production';
// Demo：沒有 micro-app 主應用，以下監聽不會觸發；語系改由 portal 外框切換
if (window.microApp) {
  window.microApp.addDataListener((data) => {
    if (data.path) {
      router.push({
        path: data.path,
        query: { entryType: 'menu' }
      });
    }
    if (data.lang) {
      languageStore.changeLanguage(data.lang);
    }
    if (data.themeColor) {
      themeStore.changeThemeColor(data.themeColor);
    }
  });
}
app.use(pinia).use(router);
app.use(i18n).use(axios).use(eventBus);

// Demo：掛載於 internal.html 的 #app（正式環境為主應用提供的 #micro-auction-management）
app.mount('#app');
