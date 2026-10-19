import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'node:path'

const root = import.meta.dirname
const src = path.resolve(root, 'src')
const internalSrc = path.join(src, 'internal')
const dealerSrc = path.join(src, 'dealer')

// 兩個前端都是從真實專案原樣搬入，各自以 `@/` 指向自己的 src。
// 依 importer 所在資料夾決定 `@/` 的根目錄，讓搬入的檔案不必改寫 import。
function scopedAlias() {
  const internalAliases = {
    '@common/': path.join(internalSrc, 'common/'),
    '@components/': path.join(internalSrc, 'components/'),
    '@assets/': path.join(internalSrc, 'assets/'),
    '@packages/': path.join(internalSrc, 'vendor/packages/')
  }
  return {
    name: 'demo-scoped-alias',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) return null
      let target = null
      if (source.startsWith('@/') || source === '@') {
        const base = importer.startsWith(internalSrc) ? internalSrc : importer.startsWith(dealerSrc) ? dealerSrc : src
        target = path.join(base, source.slice(2))
      } else {
        const hit = Object.keys(internalAliases).find((k) => source.startsWith(k) || source === k.slice(0, -1))
        if (hit) target = path.join(internalAliases[hit], source.slice(hit.length))
      }
      if (!target) return null
      return this.resolve(target, importer, { ...options, skipSelf: true })
    }
  }
}

export default defineConfig({
  plugins: [
    scopedAlias(),
    vue(),
    tailwindcss(),
    AutoImport({ resolvers: [ElementPlusResolver()], dts: false }),
    Components({ resolvers: [ElementPlusResolver()], dts: false })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['import', 'global-builtin', 'legacy-js-api'],
        // 內部系統的 scss 共用 mixins（xstar-web-pc 的 vite 設定同此）
        additionalData: (content, filename) =>
          filename.startsWith(internalSrc)
            ? `@import "${path.join(internalSrc, 'common/styles/mixins.scss')}";\n${content}`
            : content
      }
    }
  },
  server: {
    port: 5180,
    open: '/'
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(root, 'index.html'),
        internal: path.resolve(root, 'internal.html'),
        dealer: path.resolve(root, 'dealer.html')
      }
    }
  }
})
