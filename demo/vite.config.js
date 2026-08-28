import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const root = import.meta.dirname

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') }
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
