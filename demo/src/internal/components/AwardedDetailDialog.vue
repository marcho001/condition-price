<template>
  <el-dialog
    :model-value="modelValue"
    width="1000px"
    top="7vh"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dlg-head">
        <span class="dlg-title">{{ t('common.detail') }}</span>
        <span class="dlg-sub">{{ vehicle?.orderNo }}　|　{{ view.licensingPlateNumber }}</span>
      </div>
    </template>

    <div v-if="award" class="dialog-body-bg">
      <div class="info-section awarded">
        <div class="info-title">
          {{ t('auction.tabAwarded') }}
          <el-tag :type="award.method === 'AWARD' ? 'success' : 'warning'" size="small">
            {{ award.method === 'AWARD' ? t('auction.methodAward') : t('auction.methodDesignate') }}
          </el-tag>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="u-value strong">{{ dealerById(award.dealerId)?.name }}</div>
            <div class="u-label">{{ t('auction.awardedDealer') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value strong num price">{{ yenJa(award.amount) }}</div>
            <div class="u-label">{{ t('auction.awardedAmount') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value">{{ t('auction.roundN', { n: round?.round }) }}</div>
            <div class="u-label">{{ t('auction.awardedRound') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ fmtDateTime(award.at) }}／{{ award.operator }}</div>
            <div class="u-label">{{ t('auction.awardedAt') }}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-title">{{ t('auction.roundHistory') }}</div>
        <el-collapse :model-value="[award.roundId]">
          <el-collapse-item v-for="r in rounds" :key="r.id" :name="r.id">
            <template #title>
              <span class="num">
                {{ t('auction.roundN', { n: r.round }) }}　{{ fmtDate(r.startDate) }} 〜 {{ fmtDate(r.endDate) }}
                　{{ t('auction.startPrice') }} {{ yenJa(r.startPrice) }}
              </span>
            </template>
            <el-table :data="rankingOfRound(r.id)" size="small">
              <el-table-column :label="t('auction.rank')" width="70">
                <template #default="{ row }">{{ row.rank || '—' }}</template>
              </el-table-column>
              <el-table-column :label="t('auction.dealer')">
                <template #default="{ row }">{{ row.dealer?.name }}</template>
              </el-table-column>
              <el-table-column :label="t('auction.amount')" align="right" width="170">
                <template #default="{ row }">
                  <span class="num">{{ row.amount === null ? t('auction.notBidded') : yenJa(row.amount) }}</span>
                </template>
              </el-table-column>
              <el-table-column :label="t('auction.bidAt')" width="170">
                <template #default="{ row }">
                  <span class="num">{{ row.at ? fmtDateTime(row.at) : '—' }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </div>

      <VehicleInfoGrid :vehicle="vehicle" :editable="false" :lock-reason="t('vehicle.lockedClosed')" />
      <AttachmentPanel :vehicle="vehicle" :editable="false" />
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
import {
  vehicleById,
  vehicleView,
  awardOf,
  roundById,
  roundsOf,
  rankingOfRound,
  dealerById
} from '@/shared/engine.js'
import { fmtDate, fmtDateTime, yenJa } from '@/shared/format.js'

const props = defineProps({ modelValue: Boolean, vehicleId: String })
defineEmits(['update:modelValue'])

const { t } = useI18n()
const vehicle = computed(() => (props.vehicleId ? vehicleById(props.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))
const award = computed(() => (props.vehicleId ? awardOf(props.vehicleId) : null))
const round = computed(() => (award.value ? roundById(award.value.roundId) : null))
const rounds = computed(() => (props.vehicleId ? roundsOf(props.vehicleId) : []))
</script>

<style lang="scss" scoped>
.dlg-head { display: flex; align-items: baseline; gap: 12px; }
.dlg-title { font-size: 17px; font-weight: 600; }
.dlg-sub { font-size: 13px; color: #909399; }
.strong { font-size: 18px; font-weight: 600; }
.price { color: var(--el-color-primary); }
.awarded { border: 1px solid var(--el-color-primary-light-8); }
</style>
