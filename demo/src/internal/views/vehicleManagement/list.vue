<!--
  车辆拍卖 · 车辆管理列表（规格四、portal/auction-management/vehicle-list.page.md）

  只收容「已收车、尚未排定拍卖」的车辆，由贷后的收车通知 API 建档，本页不提供手动新增。
  第一栏 checkbox 供批次「排定拍卖」勾选；走行距离未填者 checkbox disabled。
  切换分页、变更每页笔数、套用或变更筛选后一律清空勾选（规格 4.5.1）。
-->
<template>
  <div class="page-wrap vehicle-list-page">
    <div class="tab-filter-section">
      <xFilterForm
        ref="filterRef"
        v-model="filterData"
        v-model:expandState="expandState"
        :init-filter="initFilter"
        :filter-form-items="filterFormItems"
        :default-visible-num="3"
        @handle-filter="handleFilter"
      />
    </div>

    <div class="table-section auction-table">
      <div class="table-toolbar">
        <el-button v-if="selectedCount" @click="clearSelection">
          {{ $t('vehicle.button.clearSelection') }}
        </el-button>
        <el-button type="primary" :disabled="!selectedCount" @click="openScheduleDialog">
          {{ $t('vehicle.button.schedule') }}
        </el-button>
      </div>

      <el-table :data="tableData" stripe max-height="500">
        <!-- 勾选栏：表头为「当前页」全选／全不选 -->
        <el-table-column width="55" align="center">
          <template #header>
            <el-checkbox
              :model-value="pageAllSelected"
              :indeterminate="pageIndeterminate"
              :disabled="!selectableRows.length"
              @change="handleSelectAllPage"
            />
          </template>
          <template #default="{ row }">
            <el-tooltip
              :content="$t('vehicle.tip.mileageRequired')"
              placement="top"
              :disabled="row.selectable"
            >
              <span class="select-cell">
                <el-checkbox
                  :model-value="isSelected(row.id)"
                  :disabled="!row.selectable"
                  @change="(val) => toggle(row, val)"
                />
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column :label="$t('vehicle.table.orderNo')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link href="javascript:;" underline="never" type="primary" @click="openDetail(row)">
              {{ row.orderNo || '-' }}
            </el-link>
          </template>
        </el-table-column>

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

        <el-table-column :label="$t('vehicle.table.carYear')" width="100">
          <template #default="{ row }">{{ row.carYear || '-' }}</template>
        </el-table-column>

        <el-table-column :label="$t('vehicle.table.color')" width="130">
          <template #default="{ row }">{{ colorName(row.color) }}</template>
        </el-table-column>

        <el-table-column prop="receivedAt" :label="$t('vehicle.table.receivedAt')" width="130" />

        <el-table-column :label="$t('table.action')" width="110" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-link
                href="javascript:;"
                underline="never"
                type="primary"
                @click="openDetail(row)"
              >
                {{ $t('vehicle.button.edit') }}
              </el-link>
            </div>
          </template>
        </el-table-column>

        <template #empty>{{ $t('noData') }}</template>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.pageNo"
          v-model:page-size="pagination.pageSize"
          :page-sizes="PAGE_SIZES"
          :total="pagination.total"
          background
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 车辆详细：自本列表开启时可编辑 -->
    <VehicleDetailDialog
      v-model="detailVisible"
      :vehicle-id="detailVehicleId"
      :source="VEHICLE_DETAIL_SOURCE.VEHICLE_LIST"
      @saved="fetchData"
    />

    <!-- 排定拍卖（批次） -->
    <ScheduleAuctionDialog
      v-model="scheduleVisible"
      :vehicles="selectedList"
      @success="handleScheduleSuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { xFilterForm } from '@packages/x-components';
import { simpleDeepClone } from '@packages/utils';
import { isBizSuccess } from '@packages/x-axios';
import { getVehicleList } from '@/api/vehicle';
import { useVehicleSelectionStore } from '@/store/modules/vehicleSelection';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE, VEHICLE_DETAIL_SOURCE } from '@common/constants';
import { useCarColor } from '@common/hooks/useCarColor';
import VehicleDetailDialog from '@components/VehicleDetailDialog.vue';
import ScheduleAuctionDialog from './components/ScheduleAuctionDialog.vue';
import { onDemoDbChanged } from '@/demo/sync';

const { t } = useI18n();
const selectionStore = useVehicleSelectionStore();
const { isSelected, toggle, toggleRows, syncRows, clear } = selectionStore;
const selectedCount = computed(() => selectionStore.selectedCount);
const selectedList = computed(() => selectionStore.selectedList);

const initFilter = ref({
  orderNo: '',
  licensingPlateNumber: '',
  receivedAt: ['', ''],
  receivedAtStart: '',
  receivedAtEnd: ''
});
const filterData = ref(simpleDeepClone(initFilter.value));
const expandState = ref(false);
const filterRef = ref(null);

const filterFormItems = computed(() => [
  {
    label: t('vehicle.filter.orderNo'),
    prop: 'orderNo',
    type: 'input',
    attrs: { maxlength: 64, clearable: true }
  },
  {
    label: t('vehicle.filter.licensingPlateNumber'),
    prop: 'licensingPlateNumber',
    type: 'input',
    attrs: { maxlength: 64, clearable: true }
  },
  {
    label: t('vehicle.filter.receivedAt'),
    prop: 'receivedAt',
    type: 'daterange',
    otherConfig: {
      start: { key: 'receivedAtStart' },
      end: { key: 'receivedAtEnd' }
    },
    attrs: { format: 'YYYY/MM/DD', valueFormat: 'YYYY-MM-DD' }
  }
]);

const pagination = reactive({
  pageNo: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0
});
const tableData = ref([]);

const queryParams = computed(() => {
  const f = filterData.value;
  return {
    orderNo: f.orderNo || undefined,
    licensingPlateNumber: f.licensingPlateNumber || undefined,
    receivedAtStart: f.receivedAtStart || undefined,
    receivedAtEnd: f.receivedAtEnd || undefined
  };
});

const fetchData = async () => {
  try {
    const res = await getVehicleList({
      ...queryParams.value,
      pageNo: pagination.pageNo,
      pageSize: pagination.pageSize
    });
    if (!isBizSuccess(res?.code)) {
      tableData.value = [];
      pagination.total = 0;
      return;
    }
    tableData.value = res.data?.records || [];
    pagination.total = res.data?.total || 0;
    syncRows(tableData.value);
  } catch {
    tableData.value = [];
    pagination.total = 0;
  }
};

/** 切换分页、变更每页笔数、套用或变更筛选后一律清空勾选（规格 4.5.1） */
const reloadAndClearSelection = () => {
  clear();
  fetchData();
};

function handleFilter() {
  pagination.pageNo = 1;
  reloadAndClearSelection();
}

const handlePageChange = (page) => {
  pagination.pageNo = page;
  reloadAndClearSelection();
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.pageNo = 1;
  reloadAndClearSelection();
};

/** 当前页可勾选的车辆 */
const selectableRows = computed(() => tableData.value.filter((row) => row.selectable));
const pageAllSelected = computed(
  () => !!selectableRows.value.length && selectableRows.value.every((row) => isSelected(row.id))
);
const pageIndeterminate = computed(
  () => !pageAllSelected.value && selectableRows.value.some((row) => isSelected(row.id))
);
const handleSelectAllPage = (val) => toggleRows(selectableRows.value, val);
const clearSelection = () => clear();

const makeSeries = (row) => [row.makeName, row.seriesName].filter(Boolean).join(' ') || '-';
const { colorName } = useCarColor();

const detailVisible = ref(false);
const detailVehicleId = ref(null);
const openDetail = (row) => {
  detailVehicleId.value = row.id;
  detailVisible.value = true;
};

const scheduleVisible = ref(false);
const openScheduleDialog = () => {
  if (!selectedCount.value) return;
  scheduleVisible.value = true;
};
const handleScheduleSuccess = () => {
  pagination.pageNo = 1;
  reloadAndClearSelection();
};

onMounted(() => {
  fetchData();
});

// Demo：共用資料在背景變動時就地重新查詢（保留篩選、分頁與勾選）
onDemoDbChanged(fetchData);

defineOptions({
  name: 'AuctionVehicleList'
});
</script>

<style lang="scss" scoped>
.tab-filter-section {
  padding: 14px 14px 0;
  margin-bottom: 16px;
  border-radius: 16px;
  background: #ffffff;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.select-cell {
  display: inline-flex;
}
</style>
