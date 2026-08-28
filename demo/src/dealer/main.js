import { createApp } from 'vue'
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/600.css'
import App from './App.vue'
import router from './router.js'
import { i18n } from './i18n.js'
import './styles/index.css'

createApp(App).use(i18n).use(router).mount('#app')
