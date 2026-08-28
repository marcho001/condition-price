import { createI18n } from 'vue-i18n'
import ja from './i18n/ja.json'

// 本サイトは日本語のみ。将来の追加に備えて i18n 構成で実装する。
export const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  fallbackLocale: 'ja',
  messages: { ja }
})
