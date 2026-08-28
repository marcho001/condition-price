<template>
  <div class="page-wrap">
    <div class="tab-filter-section">
      <el-tabs v-model="tab" class="no-border" @tab-change="onTabChange">
        <el-tab-pane :label="t('auction.tabOpen')" name="open" />
        <el-tab-pane v-if="canAwardRole" :label="t('auction.tabClosed')" name="closed" />
        <el-tab-pane v-if="canAwardRole" :label="t('auction.tabAwarded')" name="awarded" />
      </el-tabs>

      <el-form label-position="top" class="filter-form">
        <el-row :gutter="32">
          <el-col :span="6">
            <el-form-item :label="t('vehicle.orderNo')">
              <el-input v-model="filter.orderNo" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('vehicle.makeSeries')">
              <el-input v-model="filter.makeSeries" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('auction.round')">
              <el-select v-model="filter.round" clearable>
                <el-option
                  v-for="n in roundOptions"
                  :key="n"
                  :label="t('auction.roundN', { n })"
                  :value="n"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="tab === 'awarded'" :span="6">
            <el-form-item :label="t('auction.awardedDealer')">
              <el-select v-model="filter.dealerId" clearable>
                <el-option v-for="d in db.dealers" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-else :span="6">
            <el-form-item :label="t('auction.period')">
              <el-date-picker
                v-model="filter.period"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="~"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="18" class="hidden-spacer" />
          <el-col :span="6">
            <el-form-item label="&nbsp;">
              <div class="filter-btn-wrap">
                <el-button @click="reset">{{ t('common.reset') }}</el-button>
                <el-button type="primary" @click="apply">{{ t('common.search') }}</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="table-section">
      <div class="card-title">{{ t('auction.title') }}</div>

      <!-- 拍賣進行中 -->
      <el-table v-if="tab === 'open'" :data="paged" stripe>
        <el-table-column :label="t('vehicle.orderNo')" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openVehicle(row.vehicle.id)">
              {{ row.vehicle.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.vehicleInfo')" min-width="250">
          <template #default="{ row }">
            <div>{{ row.view.makeName }} {{ row.view.seriesName }}</div>
            <div class="text-muted sub num">
              {{ row.view.licensingPlateNumber }}・{{ row.view.carYear }}・{{ km(row.view.mileage) }}・{{ row.view.color }}
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.round')" width="130">
          <template #default="{ row }">
            {{ t('auction.roundN', { n: row.round.round }) }}
            <el-tag v-if="row.round.round > 1" type="warning" size="small">{{ t('auction.extraRound') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.period')" width="215" class-name="nowrap-cell">
          <template #default="{ row }">
            <span class="num">{{ fmtDate(row.round.startDate) }} 〜 {{ fmtDate(row.round.endDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.remaining')" width="150">
          <template #default="{ row }"><Countdown :round="row.round" /></template>
        </el-table-column>
        <el-table-column :label="t('auction.bidderCount')" width="120" align="center">
          <template #default="{ row }">
            <span class="count-chip num">{{ t('auction.bidderCountUnit', { n: row.bidCount }) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.operation')" :width="locale === 'ja' ? 230 : 190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openVehicle(row.vehicle.id)">
              {{ t('vehicle.actionDetail') }}
            </el-button>
            <el-button link type="primary" @click="openUrge(row.round.id)">
              {{ t('auction.actionUrge') }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :description="t('common.noData')" :image-size="80" /></template>
      </el-table>

      <!-- 已結標 -->
      <el-table v-else-if="tab === 'closed'" :data="paged" stripe>
        <el-table-column :label="t('vehicle.orderNo')" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openClosed(row.round.id)">
              {{ row.vehicle.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.vehicleInfo')" min-width="250">
          <template #default="{ row }">
            <div>{{ row.view.makeName }} {{ row.view.seriesName }}</div>
            <div class="text-muted sub num">
              {{ row.view.licensingPlateNumber }}・{{ row.view.carYear }}・{{ km(row.view.mileage) }}・{{ row.view.color }}
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.round')" width="120">
          <template #default="{ row }">{{ t('auction.roundN', { n: row.round.round }) }}</template>
        </el-table-column>
        <el-table-column :label="t('auction.period')" width="215" class-name="nowrap-cell">
          <template #default="{ row }">
            <span class="num">{{ fmtDate(row.round.startDate) }} 〜 {{ fmtDate(row.round.endDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.highestBid')" width="180" align="right">
          <template #default="{ row }">
            <b v-if="row.high.amount !== null" class="num">{{ yenJa(row.high.amount) }}</b>
            <span v-else class="text-muted">{{ t('auction.noBid') }}</span>
            <el-tag v-if="row.high.dealerIds.length > 1" type="danger" size="small" effect="dark" class="tie-tag">
              {{ t('auction.tie') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.closedAt')" width="130">
          <template #default="{ row }"><span class="num">{{ fmtDate(row.round.endDate) }}</span></template>
        </el-table-column>
        <el-table-column :label="t('common.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openClosed(row.round.id)">{{ t('common.detail') }}</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :description="t('common.noData')" :image-size="80" /></template>
      </el-table>

      <!-- 已決標 -->
      <el-table v-else :data="paged" stripe>
        <el-table-column :label="t('vehicle.orderNo')" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openAwarded(row.vehicle.id)">
              {{ row.vehicle.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.vehicleInfo')" min-width="230">
          <template #default="{ row }">
            <div>{{ row.view.makeName }} {{ row.view.seriesName }}</div>
            <div class="text-muted sub num">{{ row.view.licensingPlateNumber }}・{{ row.view.carYear }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.awardedDealer')" min-width="170">
          <template #default="{ row }">{{ dealerById(row.award.dealerId)?.name }}</template>
        </el-table-column>
        <el-table-column :label="t('auction.awardedAmount')" width="160" align="right">
          <template #default="{ row }"><b class="num">{{ yenJa(row.award.amount) }}</b></template>
        </el-table-column>
        <el-table-column :label="t('auction.awardedRound')" width="110">
          <template #default="{ row }">{{ t('auction.roundN', { n: row.round?.round }) }}</template>
        </el-table-column>
        <el-table-column :label="t('auction.awardedMethod')" width="140">
          <template #default="{ row }">
            <el-tag :type="row.award.method === 'AWARD' ? 'success' : 'warning'" size="small" effect="plain">
              {{ row.award.method === 'AWARD' ? t('auction.methodAward') : t('auction.methodDesignate') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('auction.awardedAt')" width="200">
          <template #default="{ row }">
            <span class="num">{{ fmtDateTime(row.award.at) }}</span>
            <div class="text-muted sub">{{ row.award.operator }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.operation')" :width="locale === 'ja' ? 170 : 150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAwarded(row.vehicle.id)">{{ t('common.detail') }}</el-button>
            <el-button link type="primary" @click="doComplete(row.vehicle.id)">
              {{ t('auction.actionComplete') }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty :description="t('common.noData')" :image-size="80" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="filtered.length"
        background
        layout="total, prev, pager, next"
      />
    </div>

    <VehicleDetailDialog v-model="vehicleOpen" :vehicle-id="activeVehicleId" />
    <ClosedRoundDialog
      v-model="closedOpen"
      :round-id="activeRoundId"
      @extra-round="onExtraRound"
      @done="page = 1"
    />
    <ExtraRoundDialog v-model="extraOpen" :vehicle-id="activeVehicleId" @done="afterExtra" />
    <AwardedDetailDialog v-model="awardedOpen" :vehicle-id="activeVehicleId" />

    <!-- 催投 -->
    <el-dialog v-model="urgeOpen" :title="t('auction.urgeTitle')" width="480px">
      <template v-if="urgeRound">
        <p v-if="urgeTargets.length" class="urge-text">
          {{ t('auction.urgeBody', { n: urgeTargets.length }) }}
        </p>
        <p v-else class="urge-text text-muted">{{ t('auction.urgeNone') }}</p>
        <ul class="urge-list">
          <li v-for="id in urgeTargets" :key="id">{{ dealerById(id)?.name }}</li>
        </ul>
        <el-alert :title="t('auction.urgeAuto')" type="info" :closable="false" show-icon />
        <div v-if="urgeRound.urgeLogs.length" class="urge-log">
          <b>{{ t('auction.urgeLog') }}</b>
          <p v-for="(l, i) in urgeRound.urgeLogs" :key="i" class="num">
            {{ fmtDateTime(l.at) }}　{{ l.by }}　{{ t('auction.bidderCountUnit', { n: l.targets.length }) }}
          </p>
        </div>
      </template>
      <template #footer>
        <el-button @click="urgeOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :disabled="!urgeTargets.length" @click="doUrge">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import Countdown from '../components/Countdown.vue'
import VehicleDetailDialog from '../components/VehicleDetailDialog.vue'
import ClosedRoundDialog from '../components/ClosedRoundDialog.vue'
import ExtraRoundDialog from '../components/ExtraRoundDialog.vue'
import AwardedDetailDialog from '../components/AwardedDetailDialog.vue'
import { db } from '@/shared/store.js'
import {
  vehicleById,
  vehicleView,
  roundById,
  bidsOfRound,
  highestOfRound,
  dealerById,
  unbidInvitees,
  sendUrge,
  markCompleted
} from '@/shared/engine.js'
import { ROLE, VEHICLE_STATUS } from '@/shared/constants.js'
import { fmtDate, fmtDateTime, yenJa, km } from '@/shared/format.js'

const { t, locale } = useI18n()

const canAwardRole = computed(() => db.internalUser.roles.includes(ROLE.AWARD))
const tab = ref('open')

const blank = () => ({ orderNo: '', makeSeries: '', round: '', period: null, dealerId: '' })
const filter = reactive(blank())
const applied = ref(blank())
const page = ref(1)
const pageSize = 10

const vehicleOpen = ref(false)
const closedOpen = ref(false)
const extraOpen = ref(false)
const awardedOpen = ref(false)
const urgeOpen = ref(false)
const activeVehicleId = ref('')
const activeRoundId = ref('')

const openRows = computed(() =>
  db.rounds
    .filter((r) => r.status === 'OPEN')
    .map((r) => ({ round: r, vehicle: vehicleById(r.vehicleId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.IN_AUCTION)
    .map((x) => ({
      ...x,
      view: vehicleView(x.vehicle),
      bidCount: bidsOfRound(x.round.id).length
    }))
    .sort((a, b) => dayjs(b.vehicle.receivedAt).valueOf() - dayjs(a.vehicle.receivedAt).valueOf())
)

const closedRows = computed(() =>
  db.rounds
    .filter((r) => r.status === 'CLOSED')
    .map((r) => ({ round: r, vehicle: vehicleById(r.vehicleId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.CLOSED)
    .filter((x) => {
      // 同じ車両の最新ラウンドだけを表示
      const latest = db.rounds
        .filter((r) => r.vehicleId === x.vehicle.id)
        .reduce((a, b) => (a.round > b.round ? a : b))
      return latest.id === x.round.id
    })
    .map((x) => ({ ...x, view: vehicleView(x.vehicle), high: highestOfRound(x.round.id) }))
    .sort((a, b) => dayjs(b.round.endDate).valueOf() - dayjs(a.round.endDate).valueOf())
)

const awardedRows = computed(() =>
  db.awards
    .filter((a) => !a.completed)
    .map((a) => ({ award: a, vehicle: vehicleById(a.vehicleId), round: roundById(a.roundId) }))
    .filter((x) => x.vehicle && x.vehicle.status === VEHICLE_STATUS.AWARDED)
    .map((x) => ({ ...x, view: vehicleView(x.vehicle) }))
    .sort((a, b) => b.award.at - a.award.at)
)

const rows = computed(() =>
  tab.value === 'open' ? openRows.value : tab.value === 'closed' ? closedRows.value : awardedRows.value
)

const roundOptions = computed(() => [...new Set(rows.value.map((r) => r.round?.round))].filter(Boolean).sort())

const filtered = computed(() => {
  const f = applied.value
  return rows.value.filter((r) => {
    if (f.orderNo && !r.vehicle.orderNo.toLowerCase().includes(f.orderNo.toLowerCase())) return false
    if (f.makeSeries) {
      const s = `${r.view.makeName} ${r.view.seriesName} ${r.view.modelName}`.toLowerCase()
      if (!s.includes(f.makeSeries.toLowerCase())) return false
    }
    if (f.round && r.round?.round !== f.round) return false
    if (f.dealerId && r.award?.dealerId !== f.dealerId) return false
    if (f.period?.length === 2 && r.round) {
      const s = dayjs(r.round.startDate)
      if (s.isBefore(dayjs(f.period[0]), 'day') || s.isAfter(dayjs(f.period[1]), 'day')) return false
    }
    return true
  })
})

const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

const urgeRound = computed(() => (activeRoundId.value ? roundById(activeRoundId.value) : null))
const urgeTargets = computed(() => (activeRoundId.value ? unbidInvitees(activeRoundId.value) : []))

function apply() {
  applied.value = { ...filter }
  page.value = 1
}
function reset() {
  Object.assign(filter, blank())
  apply()
}
function onTabChange() {
  reset()
}
function openVehicle(id) {
  activeVehicleId.value = id
  vehicleOpen.value = true
}
function openClosed(roundId) {
  activeRoundId.value = roundId
  closedOpen.value = true
}
function openAwarded(id) {
  activeVehicleId.value = id
  awardedOpen.value = true
}
function openUrge(roundId) {
  activeRoundId.value = roundId
  urgeOpen.value = true
}
function onExtraRound() {
  const r = roundById(activeRoundId.value)
  activeVehicleId.value = r.vehicleId
  closedOpen.value = false
  extraOpen.value = true
}
function afterExtra() {
  tab.value = 'open'
  reset()
}
function doUrge() {
  const res = sendUrge(activeRoundId.value, db.internalUser.name)
  ElMessage.success(t('auction.urgeDone', { n: res.targets.length }))
  urgeOpen.value = false
}
async function doComplete(vehicleId) {
  try {
    await ElMessageBox.confirm(t('auction.completeConfirm'), t('auction.actionComplete'), { type: 'warning' })
  } catch {
    return
  }
  markCompleted(vehicleId, db.internalUser.name)
  ElMessage.success(t('auction.completeDone'))
}
</script>

<style lang="scss" scoped>
.filter-form :deep(.el-form-item) { margin-bottom: 14px; }
.filter-form :deep(.el-select) { width: 100%; }
.filter-btn-wrap {
  display: flex;
  width: 100%;
  gap: 6px;
  :deep(.el-button) { flex: 1; margin: 0; }
}
.sub { font-size: 12px; line-height: 18px; }
:deep(.nowrap-cell .cell) { white-space: nowrap; }
.hidden-spacer { visibility: hidden; }
.count-chip {
  display: inline-block;
  min-width: 46px;
  padding: 2px 8px;
  border-radius: 8px;
  background: #f0f2f5;
  color: #444;
  font-size: 12.5px;
}
.tie-tag { margin-left: 6px; }
.urge-text { margin: 0 0 8px; font-size: 13.5px; }
.urge-list {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 13px;
  color: #666;
  li { line-height: 22px; }
}
.urge-log {
  margin-top: 12px;
  font-size: 12.5px;
  color: #909399;
  b { color: #222; }
  p { margin: 4px 0 0; }
}
</style>
