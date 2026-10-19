import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import { startDemoRuntime } from './demo/runtime'
// 以函式呼叫的 Element Plus 元件（ElMessage）不經過 template，unplugin 不會自動帶入樣式，需手動引入
import 'element-plus/es/components/message/style/css'
import './style.css'

createApp(App).use(createPinia()).use(i18n).use(router).mount('#app')

// Demo：啟動共用資料的排程與變更通知
startDemoRuntime()
