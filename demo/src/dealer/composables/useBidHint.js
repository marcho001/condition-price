import { useI18n } from 'vue-i18n'
import { isExtraRound } from '@/utils/auction'
import { formatYen } from '@/utils/format'

// 金額輸入欄下方的下限提示：第一輪只提示最低 1 円（不揭露起標價），加價輪顯示起標價（規格 6.2）
export function useBidHint() {
  const { t } = useI18n()
  return (auction) =>
    isExtraRound(auction) ? t('bid.floorExtra', { price: formatYen(auction.startPrice) }) : t('bid.floorFirst')
}
