<!--
  车辆拍卖 · 拍卖管理（规格五；portal/auction-management/auction-list.page.md）
  API：auction-scheduling-portal.yaml（待开始／拍卖进行中／已结标、取消排定）、
       auction-urge-portal.yaml（催投）、auction-award-portal.yaml（已决标、出价纪录与成交操作）

  权限（见 @/store/modules/permission.js，权限码见 PERMISSION_CODE）：
  - 已结标 tab：auction:closed-tab
  - 待开始 · 下架拍卖（取消排定）：auction:cancel-schedule
  - 拍卖进行中 · 催投：auction:urge
  - 已决标 · 详细：auction:awarded-detail（无此权限整栏不显示「操作」）
  - 已结标详细内的指定成交厂商／进入加价轮：auction:designate／auction:additional-round
-->
<template>
  <div class="page-wrap auction-list-page">
    <div class="tab-filter-section">
      <el-tabs v-model="activeTab" class="no-border" @tab-change="handleTabChange">
        <el-tab-pane
          v-for="tab in visibleTabs"
          :key="tab.name"
          :label="tab.label"
          :name="tab.name"
        />
      </el-tabs>
      <xFilterForm
        :key="activeTab"
        v-model="filterData"
        v-model:expandState="expandState"
        :init-filter="initFilter"
        :filter-form-items="filterFormItems"
        :default-visible-num="4"
        @handle-filter="handleFilter"
      />
    </div>

    <div class="table-section">
      <div v-if="tabHint" class="tab-hint">{{ tabHint }}</div>
      <x-list-table
        ref="tableRef"
        :key="activeTab"
        :pagination="pagination"
        @update:pagination="(val) => Object.assign(pagination, val)"
        :columns="columns"
        stripe
        :api-handler="apiHandler"
        :query-params="queryParams"
        :pagination-sizes="PAGE_SIZES"
        :empty-text="$t('noData')"
        max-height="500"
      >
        <template #vehicle-info="{ row }">
          <div class="cell-main">{{ makeSeries(row) }}</div>
          <div class="cell-sub">{{ vehicleSub(row) }}</div>
        </template>
        <template #scheduled-by="{ row }">
          <div class="cell-main">{{ orDash(row.scheduledByName) }}</div>
          <div v-if="row.scheduledTime" class="cell-sub">{{ row.scheduledTime }}</div>
        </template>
        <template #highest-price="{ row }">
          <template v-if="row.highestPrice === null || row.highestPrice === undefined">-</template>
          <template v-else>
            {{ yen(row.highestPrice) }}
            <el-tag v-if="row.tieFlag" type="warning" size="small" class="tie-tag">
              {{ $t('auction.table.samePrice') }}
            </el-tag>
          </template>
        </template>
        <template #deal-time="{ row }">
          <div class="cell-main">{{ orDash(row.dealTime) }}</div>
          <div v-if="row.dealOperatorName" class="cell-sub">{{ row.dealOperatorName }}</div>
        </template>
      </x-list-table>
    </div>

    <!-- 车辆详细（共用）：拍卖管理四个 tab 皆为只读；依来源另显示拍卖信息、出价纪录与成交操作 -->
    <VehicleDetailDialog
      v-model="detailVisible"
      :vehicle-id="detailVehicleId"
      :source="detailSource"
      @designate="openDesignate"
      @extra-round="openExtraRound"
    />

    <UrgeBidDialog v-model="urgeVisible" :vehicle-id="urgeVehicleId" />

    <DesignateDealerDialog
      v-model="designateVisible"
      :payload="dealPayload"
      @success="handleDealDone"
      @changed="handleDealDone"
    />

    <AdditionalRoundDialog
      v-model="extraRoundVisible"
      :payload="dealPayload"
      @success="handleDealDone"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { xFilterForm, xListTable } from '@packages/x-components';
import { simpleDeepClone } from '@packages/utils';
import { isBizSuccess } from '@packages/x-axios';
import {
  getPendingAuctionList,
  getOngoingAuctionList,
  getClosedAuctionList,
  getAwardedAuctionList,
  cancelSchedule
} from '@/api/auction';
import { getDealerList } from '@/api/dealer';
import { useDictStore } from '@/store/modules/dict';
import { usePermissionStore } from '@/store/modules/permission';
import {
  AUCTION_TAB,
  BIZ_CODE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PERMISSION_CODE,
  ROUND_TYPE,
  VEHICLE_DETAIL_SOURCE
} from '@common/constants';
import { formatAmount, orDash } from '@common/utils/tools';
import VehicleDetailDialog from '@components/VehicleDetailDialog.vue';
import UrgeBidDialog from './components/UrgeBidDialog.vue';
import DesignateDealerDialog from './components/DesignateDealerDialog.vue';
import AdditionalRoundDialog from './components/AdditionalRoundDialog.vue';
import { onDemoDbChanged } from '@/demo/sync';

const { t } = useI18n();
const dictStore = useDictStore();
const { getDictValue } = dictStore;
const { checkPermission } = usePermissionStore();

const allTabs = computed(() => [
  { name: AUCTION_TAB.PENDING, label: t('auction.tab.pending') },
  { name: AUCTION_TAB.ONGOING, label: t('auction.tab.ongoing') },
  { name: AUCTION_TAB.CLOSED, label: t('auction.tab.closed') },
  { name: AUCTION_TAB.AWARDED, label: t('auction.tab.awarded') }
]);
const visibleTabs = computed(() =>
  allTabs.value.filter(
    (tab) => tab.name !== AUCTION_TAB.CLOSED || checkPermission([PERMISSION_CODE.CLOSED_TAB])
  )
);

const activeTab = ref(AUCTION_TAB.PENDING);
const expandState = ref(false);
const tableRef = ref(null);

const TAB_API = {
  [AUCTION_TAB.PENDING]: getPendingAuctionList,
  [AUCTION_TAB.ONGOING]: getOngoingAuctionList,
  [AUCTION_TAB.CLOSED]: getClosedAuctionList,
  [AUCTION_TAB.AWARDED]: getAwardedAuctionList
};
const apiHandler = computed(() => TAB_API[activeTab.value]);

const tabHint = computed(() => {
  if (activeTab.value === AUCTION_TAB.PENDING) return t('auction.pendingHint');
  if (activeTab.value === AUCTION_TAB.AWARDED) return t('auction.settledNote');
  return '';
});

/** 轮次类型固定两个选项，不取自当前资料 */
const roundTypeOptions = computed(() => [
  { value: ROUND_TYPE.FIRST, label: t('auction.roundType.first') },
  { value: ROUND_TYPE.ADDITIONAL, label: t('auction.roundType.additional') }
]);
const roundTypeName = (value) => {
  if (value === ROUND_TYPE.FIRST) return t('auction.roundType.first');
  if (value === null || value === undefined) return '-';
  return t('auction.roundType.additional');
};

/** 得标厂商多选下拉，取自厂商主档（含已停用——历史得标者可能已停用） */
const dealerOptions = ref([]);
const loadDealerOptions = async () => {
  try {
    const res = await getDealerList({});
    if (!isBizSuccess(res?.code)) return;
    dealerOptions.value = (Array.isArray(res.data) ? res.data : []).map((item) => ({
      value: item.id,
      label: item.dealerName
    }));
  } catch {
    dealerOptions.value = [];
  }
};

const initFilter = computed(() => {
  const base = {
    orderNo: '',
    licensingPlateNumber: '',
    roundType: ''
  };
  if (activeTab.value === AUCTION_TAB.AWARDED) {
    return { ...base, dealerIds: [] };
  }
  return { ...base, period: ['', ''], startDateFrom: '', startDateTo: '' };
});

const filterData = ref(simpleDeepClone(initFilter.value));

const filterFormItems = computed(() => {
  const items = [
    {
      label: t('auction.filter.orderNo'),
      prop: 'orderNo',
      type: 'input',
      attrs: { maxlength: 64, clearable: true }
    },
    {
      label: t('auction.filter.licensingPlateNumber'),
      prop: 'licensingPlateNumber',
      type: 'input',
      attrs: { maxlength: 64, clearable: true }
    },
    {
      label: t('auction.filter.roundType'),
      prop: 'roundType',
      type: 'select',
      attrs: { clearable: true },
      otherConfig: {
        options: roundTypeOptions.value,
        optionsKeyMap: { value: 'value', label: 'label' }
      }
    }
  ];
  if (activeTab.value === AUCTION_TAB.AWARDED) {
    // 已决标：得标厂商多选，不提供起讫日期筛选
    items.push({
      label: t('auction.filter.winnerDealer'),
      prop: 'dealerIds',
      type: 'select',
      attrs: { clearable: true, multiple: true, collapseTags: true },
      otherConfig: {
        options: dealerOptions.value,
        optionsKeyMap: { value: 'value', label: 'label' }
      }
    });
  } else {
    // 起讫日期比对拍卖开始日
    items.push({
      label: t('auction.filter.period'),
      prop: 'period',
      type: 'daterange',
      otherConfig: {
        start: { key: 'startDateFrom' },
        end: { key: 'startDateTo' }
      },
      attrs: { format: 'YYYY/MM/DD', valueFormat: 'YYYY-MM-DD' }
    });
  }
  return items;
});

/** 已套用的筛选条件；按查询后才更新，避免输入时就触发请求 */
const appliedFilter = ref(simpleDeepClone(initFilter.value));
const queryParams = computed(() => {
  const f = appliedFilter.value;
  const params = {
    orderNo: f.orderNo || undefined,
    licensingPlateNumber: f.licensingPlateNumber || undefined,
    roundType: f.roundType || undefined
  };
  if (activeTab.value === AUCTION_TAB.AWARDED) {
    params.dealerIds = f.dealerIds?.length ? f.dealerIds : undefined;
  } else {
    params.startDateFrom = f.startDateFrom || undefined;
    params.startDateTo = f.startDateTo || undefined;
  }
  return params;
});

const pagination = reactive({ pageNo: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });

const yen = (value) => `${formatAmount(value)} ${t('auction.yen')}`;
const makeSeries = (row) => [row.makeName, row.seriesName].filter(Boolean).join(' ') || '-';
const colorName = (code) => (code ? getDictValue(String(code), 'color', String(code)) : '');
/** 车辆资料副行：车牌・年份・里程・颜色；已决标仅车牌・年份 */
const vehicleSub = (row) => {
  const parts = [row.licensingPlateNumber, row.carYear];
  if (activeTab.value !== AUCTION_TAB.AWARDED) {
    const mileage = row.mileage === null || row.mileage === undefined ? '' : row.mileage;
    parts.push(mileage === '' ? '' : `${formatAmount(mileage)} km`, colorName(row.color));
  }
  return parts.filter((item) => item !== '' && item !== null && item !== undefined).join(' ・ ');
};

const detailVisible = ref(false);
const detailVehicleId = ref(null);
const detailSource = ref(VEHICLE_DETAIL_SOURCE.AUCTION_ONGOING);
/** 拍卖管理四个 tab 的「车辆详细」／「详细」都开启同一个共用弹窗，以来源区分显示内容 */
const openDetail = (row, source) => {
  detailVehicleId.value = row.vehicleId;
  detailSource.value = source;
  detailVisible.value = true;
};
const openPendingDetail = (row) => openDetail(row, VEHICLE_DETAIL_SOURCE.AUCTION_PENDING);
const openVehicleDetail = (row) => openDetail(row, VEHICLE_DETAIL_SOURCE.AUCTION_ONGOING);
const openClosedDetail = (row) => openDetail(row, VEHICLE_DETAIL_SOURCE.AUCTION_CLOSED);
const openAwardedDetail = (row) => openDetail(row, VEHICLE_DETAIL_SOURCE.AUCTION_AWARDED);

const refreshTable = () => tableRef.value?.fetchData();

/** 催投（urge-bid.action.md） */
const urgeVisible = ref(false);
const urgeVehicleId = ref(null);
const openUrge = (row) => {
  urgeVehicleId.value = row.vehicleId;
  urgeVisible.value = true;
};

/** 成交操作（自已结标详细弹窗发起）：指定成交厂商／进入加价拍卖 */
const designateVisible = ref(false);
const extraRoundVisible = ref(false);
const dealPayload = ref({});
const openDesignate = (payload) => {
  dealPayload.value = payload;
  designateVisible.value = true;
};
const openExtraRound = (payload) => {
  dealPayload.value = payload;
  extraRoundVisible.value = true;
};
/** 成交或进入加价拍卖后该笔离开已结标：关闭详细弹窗并刷新列表 */
const handleDealDone = () => {
  detailVisible.value = false;
  refreshTable();
};

/** 后端回传的字段会拼进 HTML，先转义避免被当成标签解析 */
const escapeHtml = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** 取消排定（cancel-schedule.action.md）：二次确认后送出，首轮退回车辆管理、加价轮退回已结标 */
async function handleCancelSchedule(row) {
  const isFirst = row.roundType === ROUND_TYPE.FIRST;
  const infoLine = (label, value) =>
    `<div class="auction-cancel-info"><span class="auction-cancel-info__label">${escapeHtml(
      label
    )}</span><span>${escapeHtml(String(orDash(value)))}</span></div>`;
  try {
    await ElMessageBox.confirm(
      `<p class="auction-cancel-title">${t('auction.action.cancelScheduleConfirm')}${isFirst ? t('auction.cancel.first') : t('auction.cancel.extra')}</p>
      <div class="auction-cancel-infos">
        ${infoLine(t('auction.table.orderNo'), row.orderNo)}
        ${infoLine(t('auction.filter.licensingPlateNumber'), row.licensingPlateNumber)}
        ${infoLine(t('vehicle.table.makeSeries'), makeSeries(row))}
        ${infoLine(t('auction.table.roundType'), roundTypeName(row.roundType))}
        ${infoLine(t('auction.table.period'), `${row.startDate} ~ ${row.endDate}`)}
      </div>`,
      t('auction.cancel.title'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        dangerouslyUseHTMLString: true
      }
    );
  } catch {
    return;
  }
  const res = await cancelSchedule({ roundId: row.roundId });
  if (isBizSuccess(res?.code)) {
    ElMessage.success(t('auction.cancel.done'));
  } else if (res?.code === BIZ_CODE.SCHEDULE_ALREADY_STARTED) {
    ElMessage.error(t('auction.cancel.started'));
  } else {
    ElMessage.error(res?.message || t('failed'));
    return;
  }
  refreshTable();
}

/** 共用栏位：车辆资料（主行 メーカー＋車系，副行 车牌・年份・里程・颜色） */
const vehicleInfoColumn = () => ({
  prop: 'vehicleInfo',
  label: t('auction.table.vehicleInfo'),
  minWidth: 260,
  slot: 'vehicle-info',
  showOverflowTooltip: false
});
/** 共用栏位：轮次类型（只显示首轮／加价轮，不显示第几轮） */
const roundTypeColumn = () => ({
  prop: 'roundType',
  label: t('auction.table.roundType'),
  width: 140,
  formatter: (row) => roundTypeName(row.roundType)
});
const periodColumn = () => ({
  prop: 'period',
  label: t('auction.table.period'),
  minWidth: 210,
  formatter: (row) => (row.startDate ? `${row.startDate} ~ ${row.endDate}` : '-')
});
const orderNoColumn = () => ({ prop: 'orderNo', label: t('auction.table.orderNo'), minWidth: 180 });

/** 待开始：不显示已出价家数、不提供催投（开始前不可能有出价） */
const pendingColumns = computed(() => [
  orderNoColumn(),
  vehicleInfoColumn(),
  roundTypeColumn(),
  periodColumn(),
  {
    prop: 'scheduledBy',
    label: t('auction.table.scheduledBy'),
    minWidth: 200,
    slot: 'scheduled-by',
    showOverflowTooltip: false
  },
  {
    prop: 'action',
    label: t('table.action'),
    width: 200,
    fixed: 'right',
    actions: [
      { label: t('auction.action.vehicleDetail'), handler: openPendingDetail },
      {
        label: t('auction.action.cancelSchedule'),
        handler: handleCancelSchedule,
        show: () => checkPermission([PERMISSION_CODE.CANCEL_SCHEDULE])
      }
    ]
  }
]);

const ongoingColumns = computed(() => [
  orderNoColumn(),
  vehicleInfoColumn(),
  roundTypeColumn(),
  periodColumn(),
  {
    prop: 'bidCount',
    label: t('auction.table.bidderCount'),
    width: 130,
    formatter: (row) => t('auction.table.bidderCountUnit', { n: row.bidCount ?? 0 })
  },
  {
    prop: 'action',
    label: t('table.action'),
    width: 200,
    fixed: 'right',
    actions: [
      { label: t('auction.action.vehicleDetail'), handler: openVehicleDetail },
      {
        label: t('auction.action.urgeBid'),
        handler: openUrge,
        show: () => checkPermission([PERMISSION_CODE.URGE])
      }
    ]
  }
]);

const closedColumns = computed(() => [
  orderNoColumn(),
  vehicleInfoColumn(),
  roundTypeColumn(),
  periodColumn(),
  {
    prop: 'highestPrice',
    label: t('auction.table.highestBid'),
    minWidth: 170,
    slot: 'highest-price',
    showOverflowTooltip: false
  },
  { prop: 'closeDate', label: t('auction.table.closedDate'), width: 130 },
  {
    prop: 'action',
    label: t('table.action'),
    width: 110,
    fixed: 'right',
    actions: [{ label: t('auction.action.detail'), handler: openClosedDetail }]
  }
]);

const awardedColumns = computed(() => {
  const cols = [
    orderNoColumn(),
    vehicleInfoColumn(),
    { prop: 'dealerName', label: t('auction.table.winnerDealer'), minWidth: 180 },
    {
      prop: 'dealPrice',
      label: t('auction.table.dealAmount'),
      minWidth: 140,
      formatter: (row) => yen(row.dealPrice)
    },
    {
      prop: 'roundType',
      label: t('auction.table.awardRoundType'),
      width: 150,
      formatter: (row) => roundTypeName(row.roundType)
    },
    {
      prop: 'dealTime',
      label: t('auction.table.awardTime'),
      minWidth: 200,
      slot: 'deal-time',
      showOverflowTooltip: false
    }
  ];
  // 无详细权限时整栏不显示「操作」
  if (checkPermission([PERMISSION_CODE.AWARDED_DETAIL])) {
    cols.push({
      prop: 'action',
      label: t('table.action'),
      width: 110,
      fixed: 'right',
      actions: [{ label: t('auction.action.detail'), handler: openAwardedDetail }]
    });
  }
  return cols;
});

const columns = computed(() => {
  if (activeTab.value === AUCTION_TAB.PENDING) return pendingColumns.value;
  if (activeTab.value === AUCTION_TAB.CLOSED) return closedColumns.value;
  if (activeTab.value === AUCTION_TAB.AWARDED) return awardedColumns.value;
  return ongoingColumns.value;
});

/** 切换 tab 时筛选条件清空并回到第 1 页（列表以 key 重新挂载并自动查询） */
function handleTabChange() {
  filterData.value = simpleDeepClone(initFilter.value);
  appliedFilter.value = simpleDeepClone(initFilter.value);
  pagination.pageNo = 1;
}

function handleFilter() {
  appliedFilter.value = simpleDeepClone(filterData.value);
  // 等 queryParams 传入列表后再从第 1 页查询
  nextTick(() => tableRef.value?.resetPage());
}

onMounted(() => {
  loadDealerOptions();
});

// Demo：共用資料在背景變動時就地重新查詢目前 tab（保留篩選、分頁，不關閉彈窗）
onDemoDbChanged(() => {
  refreshTable();
  loadDealerOptions();
});

defineOptions({
  name: 'AuctionManagementList'
});
</script>

<style lang="scss" scoped>
.tab-filter-section {
  padding: 14px 14px 0;
  margin-bottom: 16px;
  border-radius: 16px;
  background: #ffffff;
}

.tab-hint {
  margin-bottom: 12px;
  @include pingfang-regular(12px, 20px, left, #999999);
}

.tie-tag {
  margin-left: 8px;
}
</style>

<style lang="scss">
/* ElMessageBox 挂在 body 下，取消排定的确认内容需用全局样式 */
.auction-cancel-title {
  margin-bottom: 8px;
  font-weight: 600;
}

.auction-cancel-hint {
  margin-bottom: 8px;
  color: #999999;
}

.auction-cancel-infos {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 16px;
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  line-height: 22px;
  background: #f7f8fa;
}

/* 每行拆成标签／值两格，标签栏宽度取最长的标签 */
.auction-cancel-info {
  display: contents;

  &__label {
    white-space: nowrap;
    color: #999999;
  }
}
</style>
