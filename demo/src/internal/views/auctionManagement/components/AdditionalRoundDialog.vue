<!--
  「加价拍卖设定」弹窗（start-additional-round.action.md；API auction-award-portal.yaml）—— 仅催收人员

  - 起讫日必填，默认今日 ~ 今日 + 7 日，规则同排定拍卖
  - 起标价＝前一轮最高出价（前一轮无人出价为 0 元），只读
  - 邀请厂商必填、至少一家，默认全部勾选；名单为全部启用中的厂商，不限前一轮是否出价
  - 送出前二次确认（勾选家数、轮次序号、起讫日、起标价），取消回到设定弹窗、已填内容保留
  - 开始日为今日直接进拍卖进行中；开始日为未来日期先进待开始
-->
<template>
  <el-dialog
    v-model="visible"
    :title="$t('auction.extra.title')"
    :width="720"
    top="10vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="handleOpen"
  >
    <el-form ref="formRef" :model="periodForm" :rules="formRules" label-position="top">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item :label="$t('vehicle.schedule.startDate')" prop="startDate">
            <el-date-picker
              v-model="periodForm.startDate"
              type="date"
              format="YYYY/MM/DD"
              value-format="YYYY-MM-DD"
              :clearable="false"
              :disabled-date="disabledStartDate"
              :placeholder="$t('pickerPlaceholder')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('vehicle.schedule.endDate')" prop="endDate">
            <el-date-picker
              v-model="periodForm.endDate"
              type="date"
              format="YYYY/MM/DD"
              value-format="YYYY-MM-DD"
              :clearable="false"
              :disabled-date="disabledEndDate"
              :placeholder="$t('pickerPlaceholder')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('auction.extra.startPrice')">
            <div class="field-readonly">
              {{ startPriceText }}
              <span v-if="!highestPrice" class="field-hint">
                {{ $t('auction.extra.startPriceZero') }}
              </span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="$t('auction.extra.invitee')" prop="dealerIds">
            <div class="invitee">
              <div class="field-hint">{{ $t('auction.extra.inviteeHint') }}</div>
              <div class="invitee-list">
                <el-checkbox
                  v-if="dealerOptions.length"
                  :model-value="allChecked"
                  :indeterminate="indeterminate"
                  @change="handleCheckAll"
                >
                  {{ $t('auction.extra.inviteeAll') }}
                </el-checkbox>
                <el-checkbox-group v-model="periodForm.dealerIds">
                  <el-checkbox v-for="dealer in dealerOptions" :key="dealer.id" :value="dealer.id">
                    {{ dealer.dealerName }}
                  </el-checkbox>
                </el-checkbox-group>
                <span v-if="!dealerLoading && !dealerOptions.length" class="field-hint">
                  {{ $t('auction.extra.noDealer') }}
                </span>
              </div>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { isBizSuccess } from '@packages/x-axios';
import { startAdditionalRound } from '@/api/auction';
import { getDealerList } from '@/api/dealer';
import { AUCTION_STATUS, ENABLE_FLAG } from '@common/constants';
import { useAuctionPeriod } from '@common/hooks/useAuctionPeriod';
import { formatAmount } from '@common/utils/tools';

const { t } = useI18n();

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 车辆详细弹窗带出的本轮资料：{ vehicleId, round: { roundId, roundNo, highestPrice } } */
  payload: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const formRef = ref(null);
const submitting = ref(false);

const { periodForm, periodRules, resetPeriod, disabledStartDate, disabledEndDate } =
  useAuctionPeriod();
periodForm.dealerIds = [];

const formRules = computed(() => ({
  ...periodRules.value,
  dealerIds: [
    {
      type: 'array',
      required: true,
      min: 1,
      message: t('auction.extra.inviteeRequired'),
      trigger: 'change'
    }
  ]
}));

/** 起标价＝前一轮最高出价，无人出价为 0 */
const highestPrice = computed(() => props.payload?.round?.highestPrice || 0);
const startPriceText = computed(() => `${formatAmount(highestPrice.value)} ${t('auction.yen')}`);

/** 名单为全部启用中的厂商（不限前一轮是否出价），已停用的厂商不出现在勾选名单 */
const dealerLoading = ref(false);
const dealerOptions = ref([]);
const loadDealers = async () => {
  dealerLoading.value = true;
  try {
    const res = await getDealerList({ enableFlag: ENABLE_FLAG.ENABLED });
    dealerOptions.value = isBizSuccess(res?.code) && Array.isArray(res.data) ? res.data : [];
  } catch {
    dealerOptions.value = [];
  } finally {
    dealerLoading.value = false;
  }
  // 默认全部勾选
  periodForm.dealerIds = dealerOptions.value.map((item) => item.id);
};

const allChecked = computed(
  () => !!dealerOptions.value.length && periodForm.dealerIds.length === dealerOptions.value.length
);
const indeterminate = computed(() => !!periodForm.dealerIds.length && !allChecked.value);
const handleCheckAll = (val) => {
  periodForm.dealerIds = val ? dealerOptions.value.map((item) => item.id) : [];
};

const handleOpen = () => {
  resetPeriod();
  periodForm.dealerIds = [];
  formRef.value?.clearValidate();
  loadDealers();
};

/** 二次确认：按「取消」回到设定弹窗，已填内容保留 */
const confirmSubmit = () => {
  const roundNo = props.payload?.round?.roundNo;
  const body = t('auction.extra.confirmBody', {
    n: periodForm.dealerIds.length,
    round: roundNo ? roundNo + 1 : '-',
    startDate: periodForm.startDate,
    endDate: periodForm.endDate,
    startPrice: startPriceText.value
  });
  return ElMessageBox.confirm(
    h('div', [
      h('p', body),
      h('p', { style: 'margin-top: 8px; color: #999999; font-size: 12px;' }, [
        t('auction.extra.confirmNote')
      ])
    ]),
    t('auction.extra.confirmTitle'),
    {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    }
  )
    .then(() => true)
    .catch(() => false);
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (!(await confirmSubmit())) return;
  submitting.value = true;
  try {
    const res = await startAdditionalRound({
      vehicleId: props.payload.vehicleId,
      roundId: props.payload.round?.roundId,
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
      dealerIds: periodForm.dealerIds
    });
    if (!isBizSuccess(res?.code)) return;
    // 开始日在未来先进待开始，开始日 09:00 才发邀请通知
    ElMessage.success(
      res.data?.auctionStatus === AUCTION_STATUS.NOT_STARTED
        ? t('auction.extra.doneScheduled', { startDate: periodForm.startDate })
        : t('auction.extra.done')
    );
    visible.value = false;
    emit('success');
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.field-readonly {
  @include pingfang-regular(14px, 32px);
}

.field-hint {
  margin-left: 8px;
  @include pingfang-regular(12px, 20px, left, #999999);
}

.invitee {
  width: 100%;

  .field-hint {
    margin-left: 0;
  }
}

.invitee-list {
  min-height: 32px;
}

:deep(.el-date-editor.el-input),
:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}
</style>
