import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { cancelBid, submitBid } from '@/api/auction'
import { isAuctionUnavailable } from '@/api/codes'
import { myBidAmountOf } from '@/utils/auction'

/** 出價／放棄出價的結果，呼叫端依此決定彈窗與頁面的後續動作 */
export const BID_RESULT = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED', // 一般失敗（例如金額未達下限）：停在原畫面讓使用者修改
  UNAVAILABLE: 'UNAVAILABLE', // 拍賣已截止或無出價資格：要回到列表
}

/**
 * 出價／修改出價／放棄出價（規格 6.2、6.3）。卡片上的出價彈窗與詳細頁共用。
 * 失敗時的 toast 由 request 攔截器以後端訊息顯示
 */
export function useBidActions() {
  const { t } = useI18n()
  const submitting = ref(false)

  async function run(request, successKey) {
    submitting.value = true
    try {
      await request()
      ElMessage.success(t(successKey))
      return BID_RESULT.SUCCESS
    } catch (error) {
      return isAuctionUnavailable(error) ? BID_RESULT.UNAVAILABLE : BID_RESULT.FAILED
    } finally {
      submitting.value = false
    }
  }

  /** @returns {Promise<string>} BID_RESULT */
  function placeBid(auction, amount) {
    const isEdit = myBidAmountOf(auction) !== null
    return run(() => submitBid({ roundId: auction.roundId, amount }), isEdit ? 'bid.updated' : 'bid.success')
  }

  /** @returns {Promise<string>} BID_RESULT */
  function withdrawBid(auction) {
    return run(() => cancelBid({ roundId: auction.roundId }), 'cancel.success')
  }

  return { submitting, placeBid, withdrawBid }
}
