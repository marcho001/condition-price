<!--
  「排定拍卖」弹窗（规格 4.5.2）—— 批次操作

  - 拍卖期间：整批共用同一组起讫日，套用到本次全部勾选的车辆
  - 车辆清单：以 table 列出本次勾选的车辆，栏位与车辆管理列表相同，
              最后一栏为「确认详细」，开启只读的车辆详细弹窗
  - 车辆清单不可在弹窗内编辑，也不提供逐笔移除；取消本弹窗不清空勾选
-->
<template>
  <el-dialog
    v-model="visible"
    :title="$t('vehicle.schedule.title')"
    :width="960"
    top="8vh"
    :close-on-click-modal="false"
    @open="handleOpen"
  >
    <el-form ref="formRef" :model="periodForm" :rules="periodRules" label-position="top">
      <el-row :gutter="24">
        <el-col :span="8">
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
        <el-col :span="8">
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
      </el-row>
    </el-form>

    <div class="section-title">
      {{ $t('vehicle.schedule.vehicleList') }}（{{ vehicles.length }}
      {{ $t('vehicle.schedule.countUnit') }}）
    </div>
    <el-table :data="vehicles" max-height="380" class="schedule-table">
      <el-table-column
        prop="orderNo"
        :label="$t('vehicle.table.orderNo')"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="licensingPlateNumber"
        :label="$t('vehicle.table.licensingPlateNumber')"
        min-width="150"
        show-overflow-tooltip
      />
      <el-table-column :label="$t('vehicle.table.makeSeries')" min-width="200">
        <template #default="{ row }">
          <div class="cell-main">{{ makeSeries(row) }}</div>
          <div v-if="row.modelName" class="cell-sub">{{ row.modelName }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="carYear" :label="$t('vehicle.table.carYear')" width="100" />
      <el-table-column :label="$t('vehicle.table.color')" width="120">
        <template #default="{ row }">{{ colorName(row.color) }}</template>
      </el-table-column>
      <el-table-column prop="receivedAt" :label="$t('vehicle.table.receivedAt')" width="130" />
      <el-table-column :label="$t('table.action')" width="120" fixed="right">
        <template #default="{ row }">
          <el-link href="javascript:;" underline="never" type="primary" @click="openDetail(row)">
            {{ $t('vehicle.schedule.viewDetail') }}
          </el-link>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel') }}</el-button>
      <el-button type="primary" @click="handleNext">{{ $t('confirm') }}</el-button>
    </template>

    <!-- 「确认详细」：自本弹窗开启的车辆详细一律只读 -->
    <VehicleDetailDialog
      v-model="detailVisible"
      :vehicle-id="detailVehicleId"
      :source="VEHICLE_DETAIL_SOURCE.SCHEDULE_DIALOG"
    />

    <!-- 二次确认 -->
    <ScheduleConfirmDialog
      v-model="confirmVisible"
      :vehicles="vehicles"
      :start-date="periodForm.startDate"
      :end-date="periodForm.endDate"
      :submitting="submitting"
      @confirm="handleSubmit"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { isBizSuccess } from '@packages/x-axios';
import { scheduleAuction } from '@/api/auction';
import { useDictStore } from '@/store/modules/dict';
import { AUCTION_STATUS, BIZ_CODE, VEHICLE_DETAIL_SOURCE } from '@common/constants';
import { useAuctionPeriod } from '@common/hooks/useAuctionPeriod';
import VehicleDetailDialog from '@components/VehicleDetailDialog.vue';
import ScheduleConfirmDialog from './ScheduleConfirmDialog.vue';

const { t } = useI18n();
const dictStore = useDictStore();
const { getDictValue } = dictStore;

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 本次勾选的车辆整行资料 */
  vehicles: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const formRef = ref(null);
const submitting = ref(false);
const confirmVisible = ref(false);
const detailVisible = ref(false);
const detailVehicleId = ref(null);

const { periodForm, periodRules, resetPeriod, disabledStartDate, disabledEndDate } =
  useAuctionPeriod();

/** 每次开启回到默认档期：今日 ~ 今日 + 7 日（JST，精度到日） */
const handleOpen = () => {
  resetPeriod();
  formRef.value?.clearValidate();
};

const makeSeries = (row) => [row.makeName, row.seriesName].filter(Boolean).join(' ') || '-';
const colorName = (code) => (code ? getDictValue(String(code), 'color', String(code)) : '-');

const openDetail = (row) => {
  detailVehicleId.value = row.id;
  detailVisible.value = true;
};

const handleNext = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  confirmVisible.value = true;
};

/** 1301：整批未上架，逐笔列出不通过的车辆与原因 */
const showBatchFailures = (failures = []) => {
  const list = failures
    .map((item) => {
      const reason = t(`vehicle.schedule.failureReason.${item.reason}`, item.reason);
      return `${item.orderNo}（${reason}）`;
    })
    .join('\n');
  ElMessageBox.alert(`${t('vehicle.schedule.errBatch')}\n${list}`, t('tip'), {
    confirmButtonText: t('confirm'),
    type: 'error',
    customStyle: { whiteSpace: 'pre-line' }
  });
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const res = await scheduleAuction({
      orderNos: props.vehicles.map((item) => item.orderNo),
      startDate: periodForm.startDate,
      endDate: periodForm.endDate
    });
    // 后端就整批重新检核，全有或全无；失败时保留勾选，内部修正后可直接重送
    if (!isBizSuccess(res?.code)) {
      if (res?.code === BIZ_CODE.SCHEDULE_VALIDATION_FAILED) {
        showBatchFailures(res.data?.failures);
      } else {
        ElMessage.error(res?.message || t('failed'));
      }
      return;
    }
    // 开始日在未来先进待开始，开始日 09:00 才通知厂商
    const count = res.data?.vehicleCount ?? props.vehicles.length;
    ElMessage.success(
      res.data?.auctionStatus === AUCTION_STATUS.NOT_STARTED
        ? t('vehicle.schedule.doneScheduled', { n: count, startDate: periodForm.startDate })
        : t('vehicle.schedule.done', { n: count })
    );
    confirmVisible.value = false;
    visible.value = false;
    emit('success');
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.section-title {
  margin-bottom: 12px;
  @include pingfang-bold(14px, 22px);
}

.schedule-table {
  width: 100%;

  :deep(.el-table__header) thead tr th {
    background: #f8f8f8;
  }
}

:deep(.el-date-editor.el-input),
:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}
</style>
