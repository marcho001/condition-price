<template>
  <div class="page-wrap">
    <div class="tab-filter-section">
      <el-form label-position="top" class="filter-form">
        <el-row :gutter="32">
          <el-col :span="6">
            <el-form-item :label="t('vehicle.orderNo')">
              <el-input v-model="filter.orderNo" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('vehicle.plate')">
              <el-input v-model="filter.plate" clearable @keyup.enter="apply" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="t('vehicle.receivedAt')">
              <el-date-picker
                v-model="filter.receivedAt"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="~"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
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
      <div class="card-title">{{ t('vehicle.title') }}</div>
      <el-table :data="paged" stripe>
        <el-table-column :label="t('vehicle.orderNo')" min-width="170">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row.id)">
              {{ row.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('vehicle.plate')" min-width="150">
          <template #default="{ row }">{{ row.view.licensingPlateNumber }}</template>
        </el-table-column>
        <el-table-column :label="t('vehicle.makeSeries')" min-width="180">
          <template #default="{ row }">
            {{ row.view.makeName }} {{ row.view.seriesName }}
            <div class="text-muted sub">{{ row.view.modelName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="t('vehicle.carYear')" width="80">
          <template #default="{ row }"><span class="num">{{ row.view.carYear }}</span></template>
        </el-table-column>
        <el-table-column :label="t('vehicle.color')" width="140">
          <template #default="{ row }">{{ row.view.color }}</template>
        </el-table-column>
        <el-table-column :label="t('vehicle.receivedAt')" width="120">
          <template #default="{ row }"><span class="num">{{ fmtDate(row.receivedAt) }}</span></template>
        </el-table-column>
        <el-table-column
          :label="t('common.operation')"
          :width="locale === 'ja' ? 230 : 190"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">
              {{ t('vehicle.actionEdit') }}
            </el-button>
            <el-tooltip :content="t('vehicle.mileageRequired')" :disabled="canSchedule(row)" placement="top">
              <span>
                <el-button link type="primary" :disabled="!canSchedule(row)" @click="openSchedule(row.id)">
                  {{ t('vehicle.actionSchedule') }}
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="80" />
        </template>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="filtered.length"
        background
        layout="total, prev, pager, next"
      />
    </div>

    <VehicleDetailDialog v-model="detailOpen" :vehicle-id="activeId" />
    <ScheduleDialog v-model="scheduleOpen" :vehicle-id="activeId" @done="page = 1" />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import VehicleDetailDialog from '../components/VehicleDetailDialog.vue'
import ScheduleDialog from '../components/ScheduleDialog.vue'
import { db } from '@/shared/store.js'
import { vehicleView, canSchedule } from '@/shared/engine.js'
import { VEHICLE_STATUS } from '@/shared/constants.js'
import { fmtDate } from '@/shared/format.js'

const { t, locale } = useI18n()

const blank = () => ({
  orderNo: '',
  plate: '',
  receivedAt: null
})
const filter = reactive(blank())
const applied = ref(blank())
const page = ref(1)
const pageSize = 10

const detailOpen = ref(false)
const scheduleOpen = ref(false)
const activeId = ref('')

const rows = computed(() =>
  db.vehicles
    .filter((v) => v.status === VEHICLE_STATUS.PENDING_SCHEDULE)
    .map((v) => ({ ...v, view: vehicleView(v) }))
    // 預設排序：收車日由近到遠
    .sort((a, b) => dayjs(b.receivedAt).valueOf() - dayjs(a.receivedAt).valueOf())
)

const filtered = computed(() => {
  const f = applied.value
  return rows.value.filter((r) => {
    if (f.orderNo && !r.orderNo.toLowerCase().includes(f.orderNo.toLowerCase())) return false
    if (f.plate && !String(r.view.licensingPlateNumber).includes(f.plate)) return false
    if (f.receivedAt?.length === 2) {
      const d = dayjs(r.receivedAt)
      if (d.isBefore(dayjs(f.receivedAt[0]), 'day') || d.isAfter(dayjs(f.receivedAt[1]), 'day')) return false
    }
    return true
  })
})

const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

function apply() {
  applied.value = { ...filter }
  page.value = 1
}
function reset() {
  Object.assign(filter, blank())
  apply()
}
function openDetail(id) {
  activeId.value = id
  detailOpen.value = true
}
function openSchedule(id) {
  activeId.value = id
  scheduleOpen.value = true
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
</style>
