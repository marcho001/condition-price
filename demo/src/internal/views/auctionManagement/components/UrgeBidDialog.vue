<!--
  「催投」弹窗（urge-bid.action.md；API auction-urge-portal.yaml）—— 仅催收人员

  - 开启时取本轮未出价厂商名单与催投纪录（/web/auction/urge/info）
  - 未出价名单为空时提示「本轮没有未出价的厂商」并 disable 确认钮
  - 确认后送出 /web/auction/urge，对象以送出当下重新计算，不限次数
  - 「自动催投：结标日前 2 天 09:00（JST）发送一次」为静态文案，状态依纪录中是否已有自动催投判断
-->
<template>
  <el-dialog
    v-model="visible"
    :title="$t('auction.urge.title')"
    :width="640"
    top="10vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="loadInfo"
  >
    <div class="urge-body">
      <template v-if="dealers.length">
        <p class="urge-text">{{ $t('auction.urge.body', { n: dealers.length }) }}</p>
        <div class="urge-dealers">
          <el-tag v-for="dealer in dealers" :key="dealer.dealerId" type="info">
            {{ dealer.dealerName }}
          </el-tag>
        </div>
      </template>
      <p v-else-if="loaded" class="urge-text">{{ $t('auction.urge.none') }}</p>

      <div class="urge-auto">
        {{ $t('auction.urge.auto') }}
        <el-tag :type="autoSent ? 'success' : 'info'" size="small">
          {{ autoSent ? $t('auction.urge.sent') : $t('auction.urge.notYet') }}
        </el-tag>
      </div>

      <div class="section-title">{{ $t('auction.urge.log') }}</div>
      <el-table :data="logs" max-height="260" class="urge-table">
        <!-- 栏位顺序依规格：发送时间、触发人、发送家数 -->
        <el-table-column prop="createTime" :label="$t('auction.urge.logTime')" min-width="170" />
        <el-table-column :label="$t('auction.urge.logOperator')" min-width="160">
          <template #default="{ row }">{{ operatorName(row) }}</template>
        </el-table-column>
        <el-table-column :label="$t('auction.urge.logTargetCount')" width="120">
          <template #default="{ row }">
            {{ $t('auction.table.bidderCountUnit', { n: row.targetCount ?? 0 }) }}
          </template>
        </el-table-column>
        <template #empty>{{ $t('noData') }}</template>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ $t('cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="loading || !dealers.length"
        @click="handleSubmit"
      >
        {{ $t('confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { isBizSuccess } from '@packages/x-axios';
import { getUrgeInfo, urgeBid } from '@/api/auction';
import { URGE_TRIGGER_TYPE } from '@common/constants';

const { t } = useI18n();

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 拍卖进行中列表的 vehicleId，由后端取该车目前投标中的轮次 */
  vehicleId: { type: [Number, String], default: null }
});
const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const loading = ref(false);
const loaded = ref(false);
const submitting = ref(false);
const info = ref({});

const dealers = computed(() => info.value.dealers || []);
const logs = computed(() => info.value.logs || []);
const autoSent = computed(() =>
  logs.value.some((item) => item.triggerType === URGE_TRIGGER_TYPE.AUTO)
);

const operatorName = (row) =>
  row.triggerType === URGE_TRIGGER_TYPE.AUTO ? t('auction.urge.logAuto') : row.operatorName || '-';

const loadInfo = async () => {
  info.value = {};
  loaded.value = false;
  if (!props.vehicleId) return;
  loading.value = true;
  try {
    const res = await getUrgeInfo({ vehicleId: props.vehicleId });
    if (!isBizSuccess(res?.code)) return;
    info.value = res.data || {};
    loaded.value = true;
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const res = await urgeBid({ vehicleId: props.vehicleId });
    if (!isBizSuccess(res?.code)) {
      // 名单以送出当下为准，开启后有人出价或放弃时重新取一次
      loadInfo();
      return;
    }
    ElMessage.success(t('auction.urge.done', { n: res.data?.sentCount ?? 0 }));
    visible.value = false;
    emit('success');
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
.urge-text {
  margin-bottom: 12px;
  @include pingfang-regular(14px, 22px);
}

.urge-dealers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.urge-auto {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  @include pingfang-regular(12px, 20px, left, #999999);
}

.section-title {
  margin-bottom: 12px;
  @include pingfang-bold(14px, 22px);
}

.urge-table {
  width: 100%;

  :deep(.el-table__header) thead tr th {
    background: #f8f8f8;
  }
}
</style>
