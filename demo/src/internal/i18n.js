import { createI18n } from 'vue-i18n'
import ja from './i18n/ja.json'
import zh from './i18n/zh.json'

const LANG_KEY = 'jp-auction-demo/internal-lang'

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem(LANG_KEY) || 'ja',
  fallbackLocale: 'ja',
  messages: { ja, zh }
})

export const LANGS = [
  { key: 'ja', label: '日本語' },
  { key: 'zh', label: '中文' }
]

export function setLocale(lang) {
  i18n.global.locale.value = lang
  localStorage.setItem(LANG_KEY, lang)
  document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'ja'
}

export function applyElementLocale() {
  document.documentElement.lang = i18n.global.locale.value === 'zh' ? 'zh-TW' : 'ja'
}

// 車輛欄位標籤は言語で切替
export function fieldLabel(field) {
  return i18n.global.locale.value === 'zh' ? field.zh : field.ja
}
