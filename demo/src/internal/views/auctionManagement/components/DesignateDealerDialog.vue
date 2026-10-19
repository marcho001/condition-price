<!--
  「指定成交厂商」弹窗（designate-winner.action.md；API auction-award-portal.yaml）—— 仅催收人员

  - 可选对象为本轮有出价、且目前启用的厂商（含非最高价）；停用厂商列出但不可选
  - 开启时不预选任何厂商（包含最高价），须自行选定才能送出
  - 成交金额等于该厂商的出价金额，不可调整；送出前二次确认
  - 贷后成交通知失败（1501）时订单留在已结标，可重试
-->
<template>
  <el-dialog
    v-model="visible"
    :title="$t('auction.designate.title')"
    :width="720"
    top="10vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="selectedDealerId = null"
  >
    <p class="designate-hint">{{ $t('auction.designate.hint') }}</p>

    <el-table
      :data="biddenRecords"
      max-height="360"
      class="designate-table"
      highlight-current-row
      @row-click="handleRowClick"
    >
      <el-table-column width="55" align="center">
        <template #default="{ row }">
          <el-radio
            :model-value="selectedDealerId"
            :value="row.dealerId"
            :disabled="!row.enabledFlag"
            @change="selectedDealerId = row.dealerId"
          >
            <span />
          </el-radio>
        </template>
      </el-table-column>
      <el-table-column :label="$t('auction.bid.rank')" width="80">
        <template #default="{ row }">{{ row.rank ?? '-' }}</template>
      </el-table-column>
      <el-table-column :label="$t('auction.bid.dealer')" min-width="220">
        <template #default="{ row }">
          <span>{{ row.dealerName || '-' }}</span>
          <el-tag v-if="row.tieFlag" type="warning" size="small" class="bid-tag">
            {{ $t('auction.table.samePrice') }}
          </el-tag>
          <el-tag v-if="!row.enabledFlag" type="info" size="small" class="bid-tag">
            {{ $t('auction.designate.inactiveTag') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="$t('auction.bid.amount')" min-width="140">
        <template #default="{ row }">{{ yen(row.bidAmount) }}</template>
      </el-table-column>
      <el-table-column :label="$t('auction.bid.bidAt')" min-width="170">
        <template #default="{ row }">{{ row.bidTime || '-' }}</template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ $t('confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { isBizSuccess } from '@packages/x-axios';
import { designateDealer } from '@/api/auction';
import { BIZ_CODE } from '@common/constants';
import { formatAmount } from '@common/utils/tools';

const { t } = useI18n();

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 车辆详细弹窗带出的本轮资料：{ vehicleId, round: { roundId, records } } */
  payload: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue', 'success', 'changed']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const submitting = ref(false);
const selectedDealerId = ref(null);

const yen = (value) =>
  value === null || value === undefined ? '-' : `${formatAmount(value)} ${t('auction.yen')}`;

/** 只列本轮有出价的厂商；未出价者不可指定 */
const biddenRecords = computed(() =>
  (props.payload?.round?.records || []).filter(
    (item) => item.bidAmount !== null && item.bidAmount !== undefined
  )
);
const selectedRecord = computed(() =>
  biddenRecords.value.find((item) => item.dealerId === selectedDealerId.value)
);

const handleRowClick = (row) => {
  if (row.enabledFlag) selectedDealerId.value = row.dealerId;
};

const handleSubmit = async () => {
  const record = selectedRecord.value;
  if (!record) {
    ElMessage.warning(t('auction.designate.required'));
    return;
  }
  try {
    await ElMessageBox.confirm(
      t('auction.designate.confirm', { dealer: record.dealerName, amount: yen(record.bidAmount) }),
      t('auction.designate.title'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  submitting.value = true;
  try {
    const res = await designateDealer({
      vehicleId: props.payload.vehicleId,
      roundId: props.payload.round?.roundId,
      dealerId: record.dealerId
    });
    if (isBizSuccess(res?.code)) {
      ElMessage.success(t('auction.designate.done'));
      visible.value = false;
      emit('success');
      return;
    }
    // 成交通知失败：订单留在已结标、不发任何通知，可再次送出
    if (res?.code === BIZ_CODE.DEAL_NOTIFY_FAILED) {
      ElMessage.error(t('auction.designate.failed'));
      return;
    }
    ElMessage.error(res?.message || t('failed'));
    // 拍卖状态已变更：关闭并刷新列表
    if (res?.code === BIZ_CODE.AUCTION_STATUS_CHANGED) {
      visible.value = false;
      emit('changed');
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.designate-hint {
  margin-bottom: 12px;
  @include pingfang-regular(14px, 22px, left, #666666);
}

.designate-table {
  width: 100%;

  :deep(.el-table__header) thead tr th {
    background: #f8f8f8;
  }

  :deep(.el-table__row) {
    cursor: pointer;
  }
}

.bid-tag {
  margin-left: 8px;
}
</style>
