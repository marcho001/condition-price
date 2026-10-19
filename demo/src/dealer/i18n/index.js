import { createI18n } from 'vue-i18n'
import ja from './ja.json'

// 本站介面一律日文，保留 i18n 架構但不做語言切換。
// 文案來源：知識庫 PM/domain/models/auction-copy.md 第二章。
// 以下 key 在 copy 文件中沒有，暫取自 Figma 設計稿，待補回知識庫（待確認）：
//   header.*、login.placeholder/brandSub/tagline/subTagline/notice、list.countOnline、
//   card.endingSoon/year/mileage/color/period/cancel/bid/editBid/days、
//   detail.firstRound（取自 copy「用語統一」表）、cancel.amountLabel、notices.total/unreadCount/deleteNote
export default createI18n({
  legacy: false,
  locale: 'ja',
  fallbackLocale: 'ja',
  messages: { ja },
})
