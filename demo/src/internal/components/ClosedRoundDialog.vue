<template>
  <el-dialog
    :model-value="modelValue"
    width="960px"
    top="7vh"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dlg-head">
        <span class="dlg-title">{{ t('auction.closedDetailTitle') }}</span>
        <span class="dlg-sub">{{ vehicle?.orderNo }}　|　{{ view.licensingPlateNumber }}</span>
      </div>
    </template>

    <div v-if="round" class="dialog-body-bg">
      <div class="info-section">
        <div class="info-title">
          {{ view.makeName }} {{ view.seriesName }}
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
            <div class="u-value num">{{ yenJa(round.startPrice) }}</div>
            <div class="u-label">{{ t('auction.startPrice') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num strong">{{ high.amount === null ? t('auction.noBid') : yenJa(high.amount) }}</div>
            <div class="u-label">{{ t('auction.highestBid') }}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-title">{{ t('auction.ranking') }}</div>
        <el-table v-if="rows.length" :data="rows" stripe>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="history">
                <b>{{ t('auction.bidHistory') }}</b>
                <p v-for="(h, i) in row.history" :key="i" class="num">
                  {{ fmtDateTime(h.at) }} —— {{ yenJa(h.amount) }}
                </p>
                <p v-if="!row.history.length" class="text-muted">{{ t('auction.notBidded') }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="t('auction.rank')" width="90">
            <template #default="{ row }">
              <span v-if="row.rank" class="rank" :class="{ top: row.isTop }">{{ row.rank }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('auction.dealer')" min-width="200">
            <template #default="{ row }">
              {{ row.dealer?.name }}
              <el-tag v-if="row.dealer?.status === 'INACTIVE'" size="small" type="info">
                {{ t('dealer.inactive') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('auction.amount')" width="180" align="right">
            <template #default="{ row }">
              <span v-if="row.amount === null" class="text-muted">{{ t('auction.notBidded') }}</span>
              <b v-else class="num">{{ yenJa(row.amount) }}</b>
            </template>
          </el-table-column>
          <el-table-column :label="t('auction.tie')" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.tied" type="danger" size="small" effect="dark">{{ t('auction.tie') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('auction.bidAt')" width="170">
            <template #default="{ row }">
              <span class="num">{{ row.at ? fmtDateTime(row.at) : '—' }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else :description="t('auction.noBid')" :image-size="80" />
      </div>

      <div v-if="prevRounds.length" class="info-section">
        <div class="info-title">{{ t('auction.roundHistory') }}</div>
        <el-collapse>
          <el-collapse-item v-for="r in prevRounds" :key="r.id" :name="r.id">
            <template #title>
              <span class="num">
                {{ t('auction.roundN', { n: r.round }) }}　{{ fmtDate(r.startDate) }} 〜 {{ fmtDate(r.endDate) }}
                　{{ t('auction.startPrice') }} {{ yenJa(r.startPrice) }}
              </span>
            </template>
            <el-table :data="rankingOfRound(r.id)" size="small">
              <el-table-column :label="t('auction.rank')" width="70" prop="rank" />
              <el-table-column :label="t('auction.dealer')">
                <template #default="{ row }">{{ row.dealer?.name }}</template>
              </el-table-column>
              <el-table-column :label="t('auction.amount')" align="right" width="160">
                <template #default="{ row }">
                  <span class="num">{{ row.amount === null ? t('auction.notBidded') : yenJa(row.amount) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>

    <template #footer>
      <div class="footer-bar">
        <el-button @click="$emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
        <div class="acts">
          <el-tooltip
            :content="high.amount === null ? t('auction.awardDisabledNoBid') : t('auction.awardDisabledTie')"
            :disabled="awardable"
            placement="top"
          >
            <span>
              <el-button type="primary" :disabled="!awardable" @click="doAward">
                {{ t('auction.actionAward') }}
              </el-button>
            </span>
          </el-tooltip>
          <el-tooltip :content="t('auction.designateDisabled')" :disabled="designatable" placement="top">
            <span>
              <el-button :disabled="!designatable" @click="designateOpen = true">
                {{ t('auction.actionDesignate') }}
              </el-button>
            </span>
          </el-tooltip>
          <el-button @click="$emit('extra-round')">{{ t('auction.actionExtraRound') }}</el-button>
        </div>
      </div>
    </template>

    <!-- 指定成交廠商 -->
    <el-dialog v-model="designateOpen" :title="t('auction.designateTitle')" width="460px" append-to-body>
      <p class="section-hint">{{ t('auction.designateHint') }}</p>
      <el-radio-group v-model="designatePick" class="designate-list">
        <el-radio v-for="id in high.dealerIds" :key="id" :value="id" border>
          {{ dealerById(id)?.name }}
          <b class="num">{{ yenJa(high.amount) }}</b>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="designateOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!designatePick" @click="doDesignate">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  vehicleById,
  vehicleView,
  roundById,
  roundsOf,
  rankingOfRound,
  highestOfRound,
  canAward,
  canDesignate,
  awardRound,
  designateWinner,
  dealerById
} from '@/shared/engine.js'
import { db } from '@/shared/store.js'
import { fmtDate, fmtDateTime, yenJa } from '@/shared/format.js'

const props = defineProps({ modelValue: Boolean, roundId: String })
const emit = defineEmits(['update:modelValue', 'extra-round', 'done'])

const { t } = useI18n()
const designateOpen = ref(false)
const designatePick = ref('')

const round = computed(() => (props.roundId ? roundById(props.roundId) : null))
const vehicle = computed(() => (round.value ? vehicleById(round.value.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))
const rows = computed(() => (round.value ? rankingOfRound(round.value.id) : []))
const high = computed(() => (round.value ? highestOfRound(round.value.id) : { amount: null, dealerIds: [] }))
const awardable = computed(() => (round.value ? canAward(round.value.id) : false))
const designatable = computed(() => (round.value ? canDesignate(round.value.id) : false))
const prevRounds = computed(() =>
  round.value ? roundsOf(round.value.vehicleId).filter((r) => r.round < round.value.round) : []
)

async function doAward() {
  const winner = dealerById(high.value.dealerIds[0])
  try {
    await ElMessageBox.confirm(
      t('auction.awardConfirm', { dealer: winner.name, amount: yenJa(high.value.amount) }),
      t('auction.actionAward'),
      { type: 'warning' }
    )
  } catch {
    return
  }
  awardRound(round.value.vehicleId, round.value.id, db.internalUser.name)
  ElMessage.success(t('auction.awardDone'))
  emit('update:modelValue', false)
  emit('done')
}

async function doDesignate() {
  const winner = dealerById(designatePick.value)
  try {
    await ElMessageBox.confirm(
      t('auction.awardConfirm', { dealer: winner.name, amount: yenJa(high.value.amount) }),
      t('auction.actionDesignate'),
      { type: 'warning' }
    )
  } catch {
    return
  }
  designateWinner(round.value.vehicleId, round.value.id, designatePick.value, db.internalUser.name)
  ElMessage.success(t('auction.awardDone'))
  designateOpen.value = false
  designatePick.value = ''
  emit('update:modelValue', false)
  emit('done')
}
</script>

<style lang="scss" scoped>
.dlg-head { display: flex; align-items: baseline; gap: 12px; }
.dlg-title { font-size: 17px; font-weight: 600; }
.dlg-sub { font-size: 13px; color: #909399; }
.strong { font-size: 18px; font-weight: 600; }
.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #f0f2f5;
  color: #666;
  font-size: 13px;
  &.top { background: var(--el-color-primary); color: #fff; }
}
.history {
  padding: 4px 12px 8px 56px;
  font-size: 12.5px;
  color: #666;
  b { display: block; margin-bottom: 4px; color: #222; }
  p { margin: 2px 0; }
}
.footer-bar { display: flex; justify-content: space-between; align-items: center; }
.acts { display: flex; gap: 8px; }
.designate-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  :deep(.el-radio) { margin-right: 0; height: auto; padding: 12px; }
  b { margin-left: 10px; }
}
</style>
