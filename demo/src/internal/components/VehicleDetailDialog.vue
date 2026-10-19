<!--
  「车辆详细」弹窗 —— 多处共用，只有一套内容（规格 4.4）

  开启来源决定可编辑性与是否显示拍卖信息：
  - 车辆管理列表（VEHICLE_LIST）   ：车辆资料可编辑、附件可上传可删除、不显示拍卖信息
  - 排定拍卖弹窗（SCHEDULE_DIALOG）：一律只读，用途是送出前逐台核对
  - 待开始（AUCTION_PENDING）       ：只读、不可上传删除，额外显示「拍卖信息」区块
  - 拍卖进行中（AUCTION_ONGOING）  ：只读、不可上传删除，额外显示「拍卖信息」区块
  - 已结标（AUCTION_CLOSED）        ：只读，另显示「出价纪录」（本轮）与成交操作（指定成交厂商／进入加价拍卖）
  - 已决标（AUCTION_AWARDED）       ：只读，另显示「出价纪录」（各轮），无任何操作

  可编辑性最终以后端回传的 editable 为准（拍卖状态为待排定拍卖时为 true）。
-->
<template>
  <el-dialog
    v-model="visible"
    :width="1120"
    top="6vh"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
    class="vehicle-detail-dialog"
    @open="loadDetail"
  >
    <template #header>
      <div class="dlg-head">
        <span class="dlg-title">{{ $t('vehicle.detail.title') }}</span>
        <span class="dlg-sub">
          {{ detail.orderNo || '-' }}
          <span class="dlg-sep">|</span>
          {{ vehicleInfo.licensingPlateNumber || '-' }}
        </span>
      </div>
    </template>

    <div class="dialog-body-bg">
      <!-- 拍卖信息：仅从拍卖管理开启时显示；截止前只显示已出价家数，
           不列出各厂商是否已出价（未出价名单只在催投弹窗）、不含金额、不呈现剩余时间 -->
      <div v-if="showAuctionInfo" class="info-section">
        <div class="info-title">
          <span>
            {{ $t('vehicle.detail.auctionInfo') }}
            <el-tag
              v-if="auctionInfo && auctionInfo.roundType !== ROUND_TYPE.FIRST"
              type="warning"
              size="small"
            >
              {{ $t('auction.roundType.additional') }}
            </el-tag>
          </span>
        </div>
        <div v-if="auctionInfo" class="info-grid">
          <div class="info-item">
            <div class="u-value">{{ roundLabel(auctionInfo) }}</div>
            <div class="u-label">{{ $t('auction.round') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ periodLabel(auctionInfo) }}</div>
            <div class="u-label">{{ $t('auction.table.period') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ yen(auctionInfo.startPrice) }}</div>
            <div class="u-label">{{ $t('auction.startPrice') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">
              {{ $t('auction.table.bidderCountUnit', { n: auctionInfo.bidCount ?? 0 }) }}
            </div>
            <div class="u-label">{{ $t('auction.table.bidderCount') }}</div>
          </div>
        </div>
        <xNoData v-else :text="$t('noData')" />
      </div>

      <!-- 车辆资料 -->
      <div class="info-section">
        <div class="info-title">{{ $t('vehicle.detail.vehicleInfo') }}</div>
        <el-form
          ref="formRef"
          :model="conditionForm"
          :rules="formRules"
          @validate="handleFieldValidate"
          @submit.prevent
        >
          <div class="info-grid">
            <div
              v-for="field in fieldList"
              :key="field.key"
              class="info-item"
              :class="{ 'is-full': field.full }"
            >
              <!-- 可编辑栏位：走行距离（必填）、备注 -->
              <el-form-item v-if="editable && field.editable" :prop="field.key" class="u-form-item">
                <!-- 走行距离：样式同 xInfoCard 可编辑栏位——平时显示值＋编辑笔，点笔才出现输入框；
                     校验不通过时保持输入框显示，以红框提示 -->
                <div v-if="field.key === 'mileage'" class="u-value">
                  <el-input
                    v-if="mileageInputVisible"
                    ref="mileageInputRef"
                    v-model="conditionForm.mileage"
                    :maxlength="9"
                    class="input_wrapper"
                    placeholder=""
                    @blur="handleMileageBlur"
                  >
                    <template #suffix>{{ $t('vehicle.detail.mileageUnit') }}</template>
                  </el-input>
                  <template v-else>
                    <span :class="{ 'text-muted': isEmpty(conditionForm.mileage) }">
                      {{ mileageText }}
                    </span>
                    <el-icon class="edit_icon" @click="startEditMileage"><EditPen /></el-icon>
                  </template>
                </div>
                <el-input
                  v-else
                  v-model="conditionForm.remark"
                  type="textarea"
                  :rows="3"
                  :maxlength="REMARK_MAX_LENGTH"
                  show-word-limit
                  :placeholder="$t('vehicle.detail.remarkPlaceholder')"
                />
              </el-form-item>
              <!-- 只读 -->
              <div v-else class="u-value" :class="{ 'text-muted': isEmptyField(field) }">
                {{ displayValue(field) }}
              </div>
              <div class="u-label">
                <span v-if="editable && field.required" class="required-star">*</span>
                {{ field.label }}
              </div>
            </div>
          </div>
        </el-form>
      </div>

      <!-- 附件 -->
      <div class="info-section">
        <div class="info-title">
          <span>
            {{ $t('vehicle.detail.attachmentInfo') }}
          </span>
        </div>
        <p v-if="attachmentEditable" class="section-hint">
          {{ $t('vehicle.attachment.uploadTip') }}
        </p>

        <div v-if="attachments.length || attachmentEditable" class="attach-grid">
          <div v-for="item in attachments" :key="item.id" class="attach-card">
            <div class="thumb" @click="handlePreview(item)">
              <img
                v-if="item.fileUrl && isImageFile(item.fileName || item.fileId)"
                :src="item.fileUrl"
                :alt="item.fileName"
              />
              <div v-else class="thumb-placeholder">
                <el-icon :size="32"><Document /></el-icon>
              </div>
              <span v-if="isPdfFile(item.fileName || item.fileId)" class="pdf-badge">PDF</span>
              <span v-if="item.fileUrl" class="hover-mask">
                <el-icon :size="22"><ZoomIn /></el-icon>
              </span>
            </div>
            <div class="meta">
              <p class="name" :title="item.fileName">{{ item.fileName || '-' }}</p>
              <p class="sub">{{ orDash(item.uploaderName) }}</p>
              <p class="sub">{{ orDash(item.uploadTime) }}</p>
            </div>
            <el-button
              v-if="attachmentEditable"
              class="del"
              link
              type="danger"
              size="small"
              @click="handleDeleteAttachment(item)"
            >
              {{ $t('delete') }}
            </el-button>
          </div>

          <el-upload
            v-if="attachmentEditable"
            class="attach-upload"
            :show-file-list="false"
            :accept="ATTACHMENT_ACCEPT"
            :disabled="uploading"
            :before-upload="beforeUpload"
            :http-request="doUpload"
          >
            <div class="attach-card upload">
              <el-icon :size="26" :class="{ 'is-loading': uploading }">
                <Loading v-if="uploading" />
                <Plus v-else />
              </el-icon>
              <span>{{ $t('vehicle.attachment.upload') }}</span>
            </div>
          </el-upload>
        </div>
        <xNoData v-else :text="$t('vehicle.attachment.empty')" />
      </div>

      <!-- 出价纪录：仅从已结标（本轮）、已决标（各轮，依轮次序号）开启时显示 -->
      <div v-if="showBidRecord" class="info-section">
        <div class="info-title">{{ $t('vehicle.detail.bidRecord') }}</div>
        <div v-for="round in bidRounds" :key="round.roundId" class="bid-round">
          <div v-if="isAwardedSource" class="bid-round__header">
            <span class="bid-round__title">{{ roundLabel(round) }}</span>
            <span class="bid-round__sub">
              {{ periodLabel(round) }} ・ {{ $t('auction.startPrice') }}
              {{ yen(round.startPrice) }}
            </span>
            <el-tag v-if="round.dealFlag" type="success" size="small">
              {{ $t('auction.bid.dealTag') }}
            </el-tag>
          </div>
          <el-table v-if="hasBid(round)" :data="round.records || []" class="bid-table">
            <el-table-column :label="$t('auction.bid.rank')" width="80">
              <template #default="{ row }">{{ orDash(row.rank) }}</template>
            </el-table-column>
            <el-table-column :label="$t('auction.bid.dealer')" min-width="240">
              <template #default="{ row }">
                <span>{{ orDash(row.dealerName) }}</span>
                <el-tag v-if="row.dealFlag" type="success" size="small" class="bid-tag">
                  {{ $t('auction.bid.dealTag') }}
                </el-tag>
                <el-tag v-if="row.tieFlag" type="warning" size="small" class="bid-tag">
                  {{ $t('auction.table.samePrice') }}
                </el-tag>
                <el-tag v-if="!row.enabledFlag" type="info" size="small" class="bid-tag">
                  {{ $t('auction.designate.inactiveTag') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('auction.bid.amount')" min-width="140">
              <template #default="{ row }">
                {{ isNil(row.bidAmount) ? $t('auction.notBidded') : yen(row.bidAmount) }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('auction.bid.bidAt')" min-width="170">
              <template #default="{ row }">{{ orDash(row.bidTime) }}</template>
            </el-table-column>
          </el-table>
          <!-- 无人出价时以 empty component 占位 -->
          <xNoData v-else :text="$t('auction.noBid')" />
        </div>
        <xNoData v-if="!bidLoading && !bidRounds.length" :text="$t('noData')" />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ $t('close') }}</el-button>
      <!-- 成交操作：仅从已结标开启时显示（规格 5.3.1）
           指定成交厂商——本轮有出价且启用中的厂商至少一家才可点（designatable）；
           进入加价拍卖——任何结标情形都可点 -->
      <template v-if="showDealActions">
        <el-button v-if="canExtraRound" :disabled="!closedRound" @click="emitDeal('extraRound')">
          {{ $t('auction.action.extraRound') }}
        </el-button>
        <el-tooltip
          v-if="canDesignate"
          :content="designateDisabledReason"
          :disabled="!designateDisabledReason"
        >
          <span class="deal-action">
            <el-button type="primary" :disabled="designateDisabled" @click="emitDeal('designate')">
              {{ $t('auction.action.designate') }}
            </el-button>
          </span>
        </el-tooltip>
      </template>
      <el-button v-if="editable" type="primary" :loading="saving" @click="handleSave">
        {{ $t('save') }}
      </el-button>
    </template>

    <el-image-viewer
      v-if="viewerVisible"
      teleported
      :url-list="imageUrlList"
      :initial-index="viewerIndex"
      @close="viewerVisible = false"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, EditPen, Loading, Plus, ZoomIn } from '@element-plus/icons-vue';
import { isBizSuccess } from '@packages/x-axios';
import { xNoData } from '@packages/x-components';
import {
  getVehicleDetail,
  updateVehicleCondition,
  uploadVehicleAttachment,
  deleteVehicleAttachment
} from '@/api/vehicle.js';
import { getBidRecords } from '@/api/auction.js';
import { useDictStore } from '@/store/modules/dict.js';
import { usePermissionStore } from '@/store/modules/permission.js';
import { useCarColor } from '@common/hooks/useCarColor.js';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXT_LIST,
  ATTACHMENT_MAX_SIZE,
  PERMISSION_CODE,
  ROUND_TYPE,
  VEHICLE_DETAIL_SOURCE
} from '@common/constants/index.js';
import {
  formatAmount,
  orDash,
  toYearMonth,
  isImageFile,
  isPdfFile,
  getFileExt
} from '@common/utils/tools.js';

const { t } = useI18n();
const dictStore = useDictStore();
const { getDictValue } = dictStore;
const { checkPermission } = usePermissionStore();
const { colorName } = useCarColor();

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  vehicleId: { type: [Number, String], default: null },
  /** 开启来源，见 VEHICLE_DETAIL_SOURCE */
  source: { type: String, default: VEHICLE_DETAIL_SOURCE.VEHICLE_LIST }
});
const emit = defineEmits(['update:modelValue', 'saved', 'designate', 'extraRound']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const saving = ref(false);
const uploading = ref(false);
const detail = ref({});
const attachments = ref([]);
const formRef = ref(null);

const vehicleInfo = computed(() => detail.value.vehicle || {});

/** 只有自车辆管理列表开启、且后端允许编辑时才可编辑 */
const editable = computed(
  () => props.source === VEHICLE_DETAIL_SOURCE.VEHICLE_LIST && !!detail.value.editable
);
const attachmentEditable = computed(() => editable.value);
const AUCTION_SOURCES = [
  VEHICLE_DETAIL_SOURCE.AUCTION_PENDING,
  VEHICLE_DETAIL_SOURCE.AUCTION_ONGOING,
  VEHICLE_DETAIL_SOURCE.AUCTION_CLOSED,
  VEHICLE_DETAIL_SOURCE.AUCTION_AWARDED
];
const showAuctionInfo = computed(() => AUCTION_SOURCES.includes(props.source));
/** 出价纪录：已结标显示本轮、已决标显示各轮 */
const showBidRecord = computed(
  () =>
    props.source === VEHICLE_DETAIL_SOURCE.AUCTION_CLOSED ||
    props.source === VEHICLE_DETAIL_SOURCE.AUCTION_AWARDED
);
/** 成交操作只在已结标提供；已决标全部只读 */
const showDealActions = computed(() => props.source === VEHICLE_DETAIL_SOURCE.AUCTION_CLOSED);
/** 成交操作按钮各自依权限显示 */
const canDesignate = computed(() => checkPermission([PERMISSION_CODE.DESIGNATE]));
const canExtraRound = computed(() => checkPermission([PERMISSION_CODE.ADDITIONAL_ROUND]));
const isAwardedSource = computed(() => props.source === VEHICLE_DETAIL_SOURCE.AUCTION_AWARDED);

/** 拍卖信息（/web/vehicle/detail 的 auctionInfo），待排定拍卖时为 null */
const auctionInfo = computed(() => detail.value.auctionInfo || null);

const isNil = (value) => value === null || value === undefined;
const yen = (value) => (isNil(value) ? '-' : `${formatAmount(value)} ${t('auction.yen')}`);
const roundTypeName = (value) =>
  value === ROUND_TYPE.FIRST ? t('auction.roundType.first') : t('auction.roundType.additional');
/** 弹窗内显示轮次序号，例「第 3 轮・加价轮」；列表只显示轮次类型 */
const roundLabel = (round) =>
  isNil(round?.roundNo)
    ? roundTypeName(round?.roundType)
    : t('auction.roundNType', { n: round.roundNo, type: roundTypeName(round.roundType) });
const periodLabel = (round) =>
  round?.startDate ? `${round.startDate} ~ ${orDash(round.endDate)}` : '-';

/** 出价纪录（/web/auction/bid-records）：已结标为本轮一笔，已决标为各轮 */
const bidLoading = ref(false);
const bidData = ref({});
const bidRounds = computed(() => bidData.value.rounds || []);
const hasBid = (round) => (round.records || []).some((item) => !isNil(item.bidAmount));
/** 已结标的本轮 */
const closedRound = computed(() => (showDealActions.value ? bidRounds.value[0] || null : null));
/** 「指定成交厂商」：无人出价、或有出价的厂商皆已停用时 disable */
const designateDisabled = computed(
  () => bidLoading.value || !closedRound.value || !bidData.value.designatable
);
/** disable 的原因，显示于 tooltip */
const designateDisabledReason = computed(() => {
  if (!designateDisabled.value || !closedRound.value) return '';
  return hasBid(closedRound.value)
    ? t('auction.designate.disabledInactive')
    : t('auction.designate.disabledNoBid');
});

const loadBidRecords = async () => {
  bidData.value = {};
  if (!showBidRecord.value || !props.vehicleId) return;
  bidLoading.value = true;
  try {
    const res = await getBidRecords({ vehicleId: props.vehicleId });
    bidData.value = isBizSuccess(res?.code) ? res.data || {} : {};
  } finally {
    bidLoading.value = false;
  }
};

/** 成交操作交给拍卖管理页处理，带上本轮资料供指定成交／加价拍卖弹窗使用 */
const emitDeal = (type) => {
  emit(type, {
    vehicleId: props.vehicleId,
    orderNo: detail.value.orderNo,
    licensingPlateNumber: vehicleInfo.value.licensingPlateNumber,
    round: closedRound.value
  });
};

const conditionForm = reactive({
  mileage: '',
  remark: ''
});

/** 备注上限字数（规格 4.3） */
const REMARK_MAX_LENGTH = 300;

const isEmpty = (value) => value === '' || value === null || value === undefined;

/**
 * 走行距离必填（排定拍卖前提），只接受 0 以上的整数，不提供清空
 */
const formRules = {
  mileage: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (isEmpty(value)) {
          return callback(new Error(t('vehicle.tip.mileageRequired')));
        }
        if (!/^\d+$/.test(String(value))) {
          return callback(new Error(t('vehicle.detail.mileageInvalid')));
        }
        callback();
      },
      trigger: ['blur', 'change']
    }
  ],
  remark: [
    {
      max: REMARK_MAX_LENGTH,
      message: t('vehicle.detail.remarkTooLong'),
      trigger: 'blur'
    }
  ]
};

/** 车辆资料字段定义，顺序与规格 4.3 一致 */
const fieldList = computed(() => {
  const label = (key) => t(`vehicle.detail.field.${key}`);
  return [
    { key: 'makeName', label: label('makeName') },
    { key: 'seriesName', label: label('seriesName') },
    { key: 'yearName', label: label('yearName') },
    { key: 'modelName', label: label('modelName') },
    { key: 'carYear', label: label('carYear') },
    { key: 'color', label: label('color'), type: 'color' },
    { key: 'fuelType', label: label('fuelType'), dictKey: 'fuelType' },
    { key: 'displacement', label: label('displacement') },
    { key: 'mileage', label: label('mileage'), type: 'mileage', editable: true, required: true },
    { key: 'vin', label: label('vin') },
    { key: 'licensingPlateNumber', label: label('licensingPlateNumber') },
    { key: 'productDate', label: label('productDate') },
    { key: 'registeDate', label: label('registeDate'), type: 'yearMonth' },
    { key: 'vehicleUsageType', label: label('vehicleUsageType'), dictKey: 'vehicleUsageType' },
    { key: 'transferCount', label: label('transferCount') },
    { key: 'remark', label: label('remark'), full: true, editable: true }
  ];
});

/** 走行距离：编辑中或校验不通过时显示输入框 */
const mileageInputRef = ref(null);
const mileageEditing = ref(false);
const mileageInvalid = ref(false);
const mileageInputVisible = computed(() => mileageEditing.value || mileageInvalid.value);
const mileageText = computed(() =>
  isEmpty(conditionForm.mileage)
    ? '-'
    : `${formatAmount(conditionForm.mileage)} ${t('vehicle.detail.mileageUnit')}`
);
const startEditMileage = () => {
  mileageEditing.value = true;
  nextTick(() => mileageInputRef.value?.[0]?.focus?.() ?? mileageInputRef.value?.focus?.());
};
const handleMileageBlur = () => {
  mileageEditing.value = false;
};
const handleFieldValidate = (prop, isValid) => {
  if (prop === 'mileage') mileageInvalid.value = !isValid;
};

const isEmptyField = (field) => isEmpty(vehicleInfo.value[field.key]);

const displayValue = (field) => {
  const raw = vehicleInfo.value[field.key];
  if (raw === null || raw === undefined || raw === '') return '-';
  if (field.dictKey) return getDictValue(String(raw), field.dictKey, String(raw));
  if (field.type === 'color') return colorName(raw);
  if (field.type === 'yearMonth') return toYearMonth(raw).replace('-', '/');
  if (field.type === 'mileage') return `${formatAmount(raw)} ${t('vehicle.detail.mileageUnit')}`;
  return raw;
};

const resetForm = () => {
  const info = vehicleInfo.value;
  mileageEditing.value = false;
  mileageInvalid.value = false;
  conditionForm.mileage = info.mileage === null || info.mileage === undefined ? '' : info.mileage;
  conditionForm.remark = info.remark || '';
};

const loadDetail = async () => {
  // 先清空上一台车的资料，避免切换车辆时闪现旧值
  detail.value = {};
  attachments.value = [];
  resetForm();
  if (!props.vehicleId) return;
  loadBidRecords();
  const res = await getVehicleDetail({ id: props.vehicleId });
  if (!isBizSuccess(res?.code)) return;
  detail.value = res.data || {};
  attachments.value = res.data?.attachments || [];
  resetForm();
};

/** 空字符串一律送 null，后端视为清空 */
const toNullable = (value) => (value === '' || value === undefined ? null : value);

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const res = await updateVehicleCondition({
      id: detail.value.id,
      mileage: toNullable(conditionForm.mileage) === null ? null : Number(conditionForm.mileage),
      remark: toNullable(conditionForm.remark)
    });
    if (!isBizSuccess(res?.code)) return;
    ElMessage.success(t('vehicle.detail.saveSuccess'));
    emit('saved');
    visible.value = false;
  } finally {
    saving.value = false;
  }
};

const beforeUpload = (file) => {
  if (!ATTACHMENT_EXT_LIST.includes(getFileExt(file.name))) {
    ElMessage.error(t('vehicle.attachment.extError', { name: file.name }));
    return false;
  }
  if (file.size > ATTACHMENT_MAX_SIZE) {
    ElMessage.error(t('vehicle.attachment.sizeError', { name: file.name }));
    return false;
  }
  return true;
};

const doUpload = async ({ file }) => {
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('vehicleId', detail.value.id);
    formData.append('file', file);
    const res = await uploadVehicleAttachment(formData);
    if (!isBizSuccess(res?.code)) return;
    ElMessage.success(t('vehicle.attachment.uploadSuccess'));
    emit('saved');
    await loadDetail();
  } finally {
    uploading.value = false;
  }
};

const handleDeleteAttachment = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('vehicle.attachment.deleteConfirm', { name: row.fileName }),
      t('reminder'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  const res = await deleteVehicleAttachment({
    vehicleId: detail.value.id,
    attachmentId: row.id
  });
  if (!isBizSuccess(res?.code)) return;
  ElMessage.success(t('vehicle.attachment.deleteSuccess'));
  emit('saved');
  await loadDetail();
};

/** 图片走大图检视，pdf 另开分页预览 */
const viewerVisible = ref(false);
const viewerIndex = ref(0);
const imageAttachments = computed(() =>
  attachments.value.filter((item) => item.fileUrl && isImageFile(item.fileName || item.fileId))
);
const imageUrlList = computed(() => imageAttachments.value.map((item) => item.fileUrl));

const handlePreview = (row) => {
  if (!row.fileUrl) {
    ElMessage.warning(t('vehicle.attachment.previewUnavailable'));
    return;
  }
  if (isImageFile(row.fileName || row.fileId)) {
    const idx = imageAttachments.value.findIndex((item) => item.id === row.id);
    viewerIndex.value = idx < 0 ? 0 : idx;
    viewerVisible.value = true;
    return;
  }
  window.open(row.fileUrl, '_blank');
};
</script>

<style lang="scss" scoped>
.dlg-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.dlg-title {
  @include pingfang-bold(17px, 24px);
}

.dlg-sub {
  @include pingfang-regular(13px, 20px, left, #909399);

  .dlg-sep {
    margin: 0 12px;
  }
}

.dialog-body-bg {
  max-height: 68vh;
  overflow: auto;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f7f8fa;
}

.info-section {
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;

  & + & {
    margin-top: 16px;
  }
}

.info-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  @include pingfang-bold(16px, 24px);

  .el-tag {
    margin-left: 8px;
  }

  .count {
    margin-left: 4px;
    @include pingfang-regular(13px, 24px, left, #999999);
  }
}

.section-hint {
  margin-bottom: 12px;
  @include pingfang-regular(13px, 20px, left, #909399);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px 32px;

  @media screen and (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &.is-full {
    grid-column: 1 / -1;
  }

  .u-value {
    min-height: 22px;
    word-break: break-word;
    @include pingfang-regular(14px, 22px, left, #222222);

    &.text-muted {
      color: #999999;
    }
  }

  .u-label {
    @include pingfang-regular(14px, 22px, left, #999999);
  }

  .required-star {
    margin-right: 2px;
    color: var(--el-color-danger);
  }

  .num {
    font-variant-numeric: tabular-nums;
  }
}

/* 可编辑栏位样式同 @packages/x-components xInfoCard（编辑笔、输入框） */
.edit_icon {
  margin-left: 10px;
  color: #999999;
  cursor: pointer;
}

.input_wrapper {
  width: 100%;
  max-width: 220px;
}

/* 可编辑栏位：错误讯息放在输入框与标签之间，不压住下方标签 */
.u-form-item {
  margin-bottom: 0;

  :deep(.el-form-item__error) {
    position: static;
    padding-top: 2px;
  }
}

.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 12px;
}

.attach-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #eceff3;
  border-radius: 12px;
  background: #ffffff;

  .thumb {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #f2f4f6;
    cursor: pointer;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumb-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #c0c4cc;
    }

    .hover-mask {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      background: rgba(20, 24, 30, 0.42);
      opacity: 0;
      transition: opacity 0.16s ease;
    }

    &:hover .hover-mask {
      opacity: 1;
    }

    .pdf-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      letter-spacing: 0.08em;
      color: #ffffff;
      background: #c8362b;
    }
  }

  .meta {
    padding: 8px 10px 10px;

    p {
      margin: 0;
    }

    .name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      @include pingfang-regular(12.5px, 20px, left, #222222);
    }

    .sub {
      @include pingfang-regular(11px, 17px, left, #9aa0a6);
    }
  }

  .del {
    position: absolute;
    right: 6px;
    bottom: 6px;
  }

  &.upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 100%;
    min-height: 168px;
    border-style: dashed;
    color: #9aa0a6;
    font-size: 12.5px;
    cursor: pointer;

    &:hover {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
    }
  }
}

.attach-upload {
  :deep(.el-upload) {
    display: block;
    height: 100%;
  }
}

.bid-round {
  & + & {
    margin-top: 16px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__title {
    @include pingfang-bold(14px, 22px);
  }

  &__sub {
    @include pingfang-regular(12px, 20px, left, #999999);
  }
}

.bid-table {
  width: 100%;

  :deep(.el-table__header) thead tr th {
    background: #f8f8f8;
  }
}

.bid-tag {
  margin-left: 8px;
}

.deal-action {
  display: inline-block;
  margin-left: 12px;
}
</style>
