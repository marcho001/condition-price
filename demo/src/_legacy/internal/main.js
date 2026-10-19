import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElIcons from '@element-plus/icons-vue'
import ja from 'element-plus/es/locale/lang/ja'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router.js'
import { i18n, applyElementLocale } from './i18n.js'
import './styles/index.scss'

// xstar-web-pc の @packages/theme と同じロジックでテーマ色を生成
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
function adjust(hex, factor) {
  const rgb = hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * factor))))
  return rgbToHex(...rgb)
}
function applyTheme(primary) {
  const el = document.documentElement
  el.style.setProperty('--el-color-primary', primary)
  for (let i = 1; i <= 9; i++) {
    el.style.setProperty(`--el-color-primary-light-${i}`, adjust(primary, i * 0.1))
  }
  el.style.setProperty('--el-color-primary-dark-2', adjust(primary, -0.2))
}
applyTheme('#0568FF')

const app = createApp(App)
Object.entries(ElIcons).forEach(([name, comp]) => app.component(name, comp))
app.use(ElementPlus, { locale: ja })
app.use(i18n)
app.use(router)
applyElementLocale()
app.mount('#app')
