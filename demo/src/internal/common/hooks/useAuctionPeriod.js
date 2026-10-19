import { reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { DEFAULT_AUCTION_DAYS } from '@common/constants';
import { dateFromToday } from '@common/utils/tools';

/**
 * 拍卖起讫日（排定拍卖、进入加价拍卖共用）
 *
 * 默认今日 ~ 今日 + 7 日；开始日不可早于今日、结束日须晚于开始日，精度到日（JST）
 */
export function useAuctionPeriod() {
  const { t } = useI18n();

  const periodForm = reactive({
    startDate: dateFromToday(0),
    endDate: dateFromToday(DEFAULT_AUCTION_DAYS)
  });

  const periodRules = computed(() => ({
    startDate: [
      { required: true, message: t('vehicle.schedule.startDateRequired'), trigger: 'change' },
      {
        validator: (rule, value, callback) => {
          if (value && value < dateFromToday(0)) {
            return callback(new Error(t('vehicle.schedule.startDateInvalid')));
          }
          callback();
        },
        trigger: 'change'
      }
    ],
    endDate: [
      { required: true, message: t('vehicle.schedule.endDateRequired'), trigger: 'change' },
      {
        validator: (rule, value, callback) => {
          if (value && periodForm.startDate && value <= periodForm.startDate) {
            return callback(new Error(t('vehicle.schedule.endDateInvalid')));
          }
          callback();
        },
        trigger: 'change'
      }
    ]
  }));

  /** 回到默认档期 */
  const resetPeriod = () => {
    periodForm.startDate = dateFromToday(0);
    periodForm.endDate = dateFromToday(DEFAULT_AUCTION_DAYS);
  };

  const disabledStartDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  };
  const disabledEndDate = (date) => {
    const start = periodForm.startDate ? new Date(`${periodForm.startDate}T00:00:00`) : null;
    if (!start) return disabledStartDate(date);
    return date.getTime() <= start.getTime();
  };

  return { periodForm, periodRules, resetPeriod, disabledStartDate, disabledEndDate };
}
