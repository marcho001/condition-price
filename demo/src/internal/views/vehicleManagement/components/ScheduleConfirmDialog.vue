<!--
  排定拍卖 · 二次确认（规格 4.5.4）
  只读呈现 ① 本次上架台数 ② 拍卖起讫日 ③ 车辆清单（orderNo、车牌、厂牌／车型）
  此画面一律不可编辑，需修改请「返回」上一层。
-->
<template>
  <el-dialog
    v-model="visible"
    :title="$t('vehicle.schedule.confirmTitle')"
    :width="720"
    top="8vh"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="confirm-summary">
      <span class="confirm-summary__item">
        {{ $t('vehicle.schedule.confirmCount') }}：
        <b>{{ vehicles.length }}</b>
        {{ $t('vehicle.schedule.countUnit') }}
      </span>
      <span class="confirm-summary__item">
        {{ $t('vehicle.schedule.confirmPeriod') }}：
        <b>{{ startDate }} ~ {{ endDate }}</b>
      </span>
    </div>

    <el-table :data="vehicles" max-height="360" class="confirm-table">
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
    </el-table>

    <template #footer>
      <el-button @click="visible = false">{{ $t('back') }}</el-button>
      <el-button type="primary" :disabled="submitting" @click="handleConfirm">
        {{ $t('confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  vehicles: { type: Array, default: () => [] },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  submitting: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue', 'confirm']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const makeSeries = (row) => [row.makeName, row.seriesName].filter(Boolean).join(' ') || '-';

const handleConfirm = () => emit('confirm');
</script>

<style lang="scss" scoped>
.confirm-summary {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;

  &__item {
    margin-right: 32px;
    @include pingfang-regular(14px, 24px);
  }
}

.confirm-table {
  width: 100%;

  :deep(.el-table__header) thead tr th {
    background: #f8f8f8;
  }
}
</style>
