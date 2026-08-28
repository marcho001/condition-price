<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('vehicle.detailTitle')"
    width="1120px"
    top="6vh"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dlg-head">
        <span class="dlg-title">{{ t('vehicle.detailTitle') }}</span>
        <span class="dlg-sub">{{ vehicle?.orderNo }}　|　{{ view.licensingPlateNumber }}</span>
      </div>
    </template>

    <div v-if="vehicle" class="dialog-body-bg">
      <!-- 拍賣中／已結標時，額外顯示該輪拍賣資訊 -->
      <div v-if="round" class="info-section">
        <div class="info-title">
          {{ t('auction.title') }}
          <el-tag v-if="round.round > 1" type="warning" size="small">{{ t('auction.extraRound') }}</el-tag>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="u-value">{{ t('auction.roundN', { n: round.round }) }}</div>
            <div class="u-label">{{ t('auction.round') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ fmtDate(round.startDate) }} 〜 {{ fmtDate(round.endDate) }}</div>
            <div class="u-label">{{ t('auction.period') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value"><Countdown :round="round" /></div>
            <div class="u-label">{{ t('auction.remaining') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ yenJa(round.startPrice) }}</div>
            <div class="u-label">{{ t('auction.startPrice') }}</div>
          </div>
        </div>

        <el-divider />
        <p class="section-hint" style="margin-bottom: 8px">{{ t('auction.amountHidden') }}</p>
        <div class="bid-status">
          <div v-for="row in bidStatus" :key="row.dealerId" class="bid-chip" :class="{ on: row.bidded }">
            <el-icon v-if="row.bidded"><CircleCheckFilled /></el-icon>
            <el-icon v-else><Clock /></el-icon>
            <span>{{ row.name }}</span>
            <em>{{ row.bidded ? t('auction.bidded') : t('auction.notBidded') }}</em>
          </div>
        </div>
        <p class="urge-line">
          {{ t('auction.urgeAuto') }} ——
          <b :class="round.autoUrgeSent ? 'sent' : ''">
            {{ round.autoUrgeSent ? t('auction.urgeSent') : t('auction.urgeNotYet') }}
          </b>
          <template v-if="round.urgeLogs.length">
            ／{{ t('auction.urgeLog') }}：{{ round.urgeLogs.length }}
          </template>
        </p>
      </div>

      <VehicleInfoGrid :vehicle="vehicle" :editable="editable" :lock-reason="lockReason" />

      <AttachmentPanel :vehicle="vehicle" :editable="editable" />

      <div v-if="vehicle.fieldLogs.length" class="info-section">
        <div class="info-title">{{ t('vehicle.sectionHistory') }}</div>
        <el-table :data="vehicle.fieldLogs" size="small" stripe>
          <el-table-column :label="t('vehicle.historyField')" width="200">
            <template #default="{ row }">{{ fieldLabelOf(row.field) }}</template>
          </el-table-column>
          <el-table-column :label="t('vehicle.historyBefore')">
            <template #default="{ row }">{{ row.before || '—' }}</template>
          </el-table-column>
          <el-table-column :label="t('vehicle.historyAfter')">
            <template #default="{ row }">{{ row.after || '—' }}</template>
          </el-table-column>
          <el-table-column :label="t('vehicle.historyOperator')" width="120" prop="operator" />
          <el-table-column :label="t('vehicle.historyAt')" width="160">
            <template #default="{ row }">{{ fmtDateTime(row.at) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="info-section internal-price">
        <div class="info-title">
          {{ t('vehicle.sectionInternal') }}
          <el-tag type="danger" size="small" effect="plain">内部限定</el-tag>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="u-value num">{{ vehicle.guidePrice || '—' }}</div>
            <div class="u-label">{{ locale === 'zh' ? '车辆价格范围' : '車両価格範囲' }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ vehicle.valuationPrice || '—' }}</div>
            <div class="u-label">{{ locale === 'zh' ? '车辆估值' : '車両評価' }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VehicleInfoGrid from './VehicleInfoGrid.vue'
import AttachmentPanel from './AttachmentPanel.vue'
import Countdown from './Countdown.vue'
import { VEHICLE_FIELDS, VEHICLE_STATUS } from '@/shared/constants.js'
import { vehicleById, vehicleView, latestRound, bidOf, dealerById } from '@/shared/engine.js'
import { fmtDate, fmtDateTime, yenJa } from '@/shared/format.js'

const props = defineProps({
  modelValue: Boolean,
  vehicleId: String
})
defineEmits(['update:modelValue'])

const { t, locale } = useI18n()

const vehicle = computed(() => (props.vehicleId ? vehicleById(props.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))
const round = computed(() => {
  if (!vehicle.value) return null
  return vehicle.value.status === VEHICLE_STATUS.PENDING_SCHEDULE ? null : latestRound(vehicle.value.id)
})

// 4.4.3 可編輯期間：待排定拍賣のみ編集可
const editable = computed(() => vehicle.value?.status === VEHICLE_STATUS.PENDING_SCHEDULE)
const lockReason = computed(() =>
  vehicle.value?.status === VEHICLE_STATUS.IN_AUCTION
    ? t('vehicle.lockedInAuction')
    : t('vehicle.lockedClosed')
)

const bidStatus = computed(() => {
  if (!round.value) return []
  return round.value.inviteeIds.map((id) => ({
    dealerId: id,
    name: dealerById(id)?.name || id,
    bidded: !!bidOf(round.value.id, id)
  }))
})

const fieldLabelOf = (key) => {
  const f = VEHICLE_FIELDS.find((x) => x.key === key)
  if (!f) return key
  return locale.value === 'zh' ? f.zh : f.ja
}
</script>

<style lang="scss" scoped>
.dlg-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.dlg-title { font-size: 17px; font-weight: 600; color: #222; }
.dlg-sub { font-size: 13px; color: #909399; }

.bid-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.bid-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e6e9ee;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  color: #666;
  background: #fafbfc;

  em { font-style: normal; color: #b6bcc4; }
  &.on {
    border-color: var(--el-color-primary-light-6);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    em { color: var(--el-color-primary); }
  }
}
.urge-line {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: #909399;
  b { color: #e6a23c; }
  b.sent { color: #67c23a; }
}
.internal-price {
  border: 1px dashed #f0c8c4;
  background: #fffaf9;
}
</style>
