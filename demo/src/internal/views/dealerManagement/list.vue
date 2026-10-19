<!--
  车辆拍卖 · 厂商管理列表（规格六；portal/auction-management/dealer-list.page.md）

  拍卖厂商为独立主档，于本模块建档，不沿用既有的贩卖业者主档。
  厂商数量为 3–5 家，本列表不分页。
  财务人员与催收人员皆可完整操作（含解锁），不另设权限。
  正式版不显示密码——密码一律以「重设密码」重发。
-->
<template>
  <div class="page-wrap dealer-list-page">
    <div class="tab-filter-section">
      <xFilterForm
        v-model="filterData"
        v-model:expandState="expandState"
        :init-filter="initFilter"
        :filter-form-items="filterFormItems"
        :default-visible-num="3"
        @handle-filter="handleFilter"
      />
    </div>

    <div class="table-section">
      <div class="table-toolbar">
        <el-button type="primary" @click="openAdd">
          {{ $t('dealer.action.add') }}
        </el-button>
      </div>

      <x-list-table
        ref="tableRef"
        :columns="columns"
        stripe
        :show-pagination="false"
        :api-handler="dealerListApiHandler"
        :query-params="queryParams"
      >
        <template #dealer-name="{ row }">
          <div class="cell-main">{{ row.dealerName || '-' }}</div>
          <div v-if="row.remark" class="cell-sub">{{ row.remark }}</div>
        </template>
        <!-- Demo：登入 Email 下方一併顯示密碼，僅為試用方便；正式版不顯示密碼（規格六） -->
        <template #dealer-email="{ row }">
          <div class="cell-main">{{ row.email || '-' }}</div>
          <div v-if="row.demoPassword" class="cell-sub demo-password">
            {{ $t('dealer.table.demoPassword', { password: row.demoPassword }) }}
          </div>
        </template>
        <template #dealer-status="{ row }">
          <el-tag :type="row.enableFlag === ENABLE_FLAG.ENABLED ? 'success' : 'info'" size="small">
            {{
              row.enableFlag === ENABLE_FLAG.ENABLED
                ? $t('dealer.status.enabled')
                : $t('dealer.status.disabled')
            }}
          </el-tag>
          <el-tag
            v-if="row.lockedFlag === LOCKED_FLAG.LOCKED"
            type="danger"
            size="small"
            class="ml-8"
          >
            {{ $t('dealer.status.locked') }}
          </el-tag>
        </template>
      </x-list-table>
    </div>

    <DealerFormDialog v-model="formVisible" :dealer="currentDealer" @success="refresh" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { xFilterForm, xListTable } from '@packages/x-components';
import { simpleDeepClone } from '@packages/utils';
import { isBizSuccess } from '@packages/x-axios';
import { getDealerList, toggleDealerStatus, resetDealerPassword, unlockDealer } from '@/api/dealer';
import { ENABLE_FLAG, LOCKED_FLAG } from '@common/constants';
import DealerFormDialog from './components/DealerFormDialog.vue';
import { onDemoDbChanged } from '@/demo/sync';

const { t } = useI18n();

const initFilter = ref({
  dealerName: '',
  contactName: '',
  enableFlag: ''
});
const filterData = ref(simpleDeepClone(initFilter.value));
const expandState = ref(false);
const tableRef = ref(null);

const filterFormItems = computed(() => [
  {
    label: t('dealer.filter.dealerName'),
    prop: 'dealerName',
    type: 'input',
    attrs: { maxlength: 200, clearable: true }
  },
  {
    label: t('dealer.filter.contactName'),
    prop: 'contactName',
    type: 'input',
    attrs: { maxlength: 200, clearable: true }
  },
  {
    label: t('dealer.filter.enableFlag'),
    prop: 'enableFlag',
    type: 'select',
    attrs: { clearable: true },
    otherConfig: {
      options: [
        { value: ENABLE_FLAG.ENABLED, label: t('dealer.status.enabled') },
        { value: ENABLE_FLAG.DISABLED, label: t('dealer.status.disabled') }
      ],
      optionsKeyMap: { value: 'value', label: 'label' }
    }
  }
]);

const queryParams = computed(() => {
  const f = filterData.value;
  const body = {
    dealerName: f.dealerName || undefined,
    contactName: f.contactName || undefined
  };
  if (f.enableFlag !== '' && f.enableFlag !== null && f.enableFlag !== undefined) {
    body.enableFlag = Number(f.enableFlag);
  }
  return body;
});

/** 厂商列表不分页，后端直接回数组 */
async function dealerListApiHandler(params) {
  try {
    const res = await getDealerList(params);
    if (!isBizSuccess(res?.code)) {
      return { data: { records: [], total: 0 } };
    }
    const list = Array.isArray(res.data) ? res.data : [];
    return { data: { records: list, total: list.length } };
  } catch {
    return { data: { records: [], total: 0 } };
  }
}

const refresh = () => tableRef.value?.fetchData();

function handleFilter() {
  refresh();
}

// Demo：共用資料在背景變動時就地重新查詢
onDemoDbChanged(refresh);

const formVisible = ref(false);
const currentDealer = ref(null);
const openAdd = () => {
  currentDealer.value = null;
  formVisible.value = true;
};
const openEdit = (row) => {
  currentDealer.value = { ...row };
  formVisible.value = true;
};

/** 停用／启用：不删除资料 */
const handleToggleStatus = async (row) => {
  const toEnable = row.enableFlag !== ENABLE_FLAG.ENABLED;
  try {
    await ElMessageBox.confirm(
      toEnable ? '' : t('dealer.confirm.disableContent'),
      toEnable ? t('dealer.confirm.enableTitle') : t('dealer.confirm.disableTitle'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  const res = await toggleDealerStatus({
    id: row.id,
    enableFlag: toEnable ? ENABLE_FLAG.ENABLED : ENABLE_FLAG.DISABLED
  });
  if (!isBizSuccess(res?.code)) return;
  ElMessage.success(t('dealer.confirm.toggleSuccess'));
  refresh();
};

/** 重设密码：产生新密码寄至登入 Email，旧密码即刻失效；不解除账号锁定 */
const handleResetPassword = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('dealer.confirm.resetPasswordContent'),
      t('dealer.confirm.resetPasswordTitle'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  const res = await resetDealerPassword({ id: row.id });
  if (!isBizSuccess(res?.code)) return;
  ElMessage.success(t('dealer.confirm.resetPasswordSuccess'));
  refresh();
};

/** 解锁：仅在该帐号处于锁定状态时可点；错误次数归零、密码不变 */
const handleUnlock = async (row) => {
  try {
    await ElMessageBox.confirm(t('dealer.confirm.unlockContent'), t('dealer.confirm.unlockTitle'), {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    });
  } catch {
    return;
  }
  const res = await unlockDealer({ id: row.id });
  if (!isBizSuccess(res?.code)) return;
  ElMessage.success(t('dealer.confirm.unlockSuccess'));
  refresh();
};

const columns = computed(() => [
  {
    prop: 'dealerName',
    label: t('dealer.table.dealerName'),
    minWidth: 220,
    slot: 'dealer-name',
    showOverflowTooltip: false
  },
  { prop: 'contactName', label: t('dealer.table.contactName'), minWidth: 120 },
  { prop: 'phone', label: t('dealer.table.phone'), minWidth: 140 },
  {
    prop: 'email',
    label: t('dealer.table.email'),
    minWidth: 220,
    slot: 'dealer-email',
    showOverflowTooltip: false
  },
  {
    prop: 'status',
    label: t('dealer.table.status'),
    minWidth: 140,
    slot: 'dealer-status',
    showOverflowTooltip: false
  },
  { prop: 'createTime', label: t('dealer.table.createTime'), minWidth: 180 },
  {
    prop: 'action',
    label: t('table.action'),
    width: 280,
    fixed: 'right',
    actions: [
      { label: t('dealer.action.edit'), handler: openEdit },
      {
        label: (row) =>
          row.enableFlag === ENABLE_FLAG.ENABLED
            ? t('dealer.action.disable')
            : t('dealer.action.enable'),
        handler: handleToggleStatus
      },
      { label: t('dealer.action.resetPassword'), handler: handleResetPassword },
      {
        label: t('dealer.action.unlock'),
        handler: handleUnlock,
        show: (row) => row.lockedFlag === LOCKED_FLAG.LOCKED
      }
    ]
  }
]);

defineOptions({
  name: 'AuctionDealerList'
});
</script>

<style lang="scss" scoped>
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.tab-filter-section {
  padding: 14px 14px 0;
  margin-bottom: 16px;
  border-radius: 16px;
  background: #ffffff;
}

.ml-8 {
  margin-left: 8px;
}

.demo-password {
  color: #b0b3b8;
  font-size: 12px;
}
</style>
