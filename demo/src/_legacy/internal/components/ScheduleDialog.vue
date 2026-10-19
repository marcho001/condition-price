<template>
  <el-dialog
    :model-value="modelValue"
    :title="step === 1 ? t('schedule.title') : t('schedule.confirmTitle')"
    width="1000px"
    top="6vh"
    @update:model-value="close"
  >
    <!-- Step 1：整批共用的起訖日 ＋ 本次勾選的車輛清單 -->
    <div v-if="step === 1">
      <el-alert :title="t('schedule.batchHint', { n: rows.length })" type="info" :closable="false" show-icon />

      <el-form label-position="top" style="margin-top: 14px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item :label="t('schedule.startDate')" required>
              <el-date-picker
                v-model="form.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled-date="beforeToday"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('schedule.endDate')" required>
              <el-date-picker
                v-model="form.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled-date="notAfterStart"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('schedule.round')">
              <el-input :model-value="t('schedule.firstRound')" disabled />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <p class="section-hint">{{ t('schedule.rule') }}</p>

      <!-- 彈窗內不可編輯、也不提供逐筆移除；要調整請取消彈窗回列表（勾選不會被清空） -->
      <el-table :data="rows" stripe max-height="340" style="margin-top: 6px">
        <el-table-column :label="t('vehicle.orderNo')" min-width="160" prop="orderNo" />
        <el-table-column :label="t('vehicle.plate')" min-width="140">
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
        <el-table-column :label="t('vehicle.color')" width="130">
          <template #default="{ row }">{{ row.view.color }}</template>
        </el-table-column>
        <el-table-column :label="t('vehicle.receivedAt')" width="110">
          <template #default="{ row }"><span class="num">{{ fmtDate(row.receivedAt) }}</span></template>
        </el-table-column>
        <el-table-column :label="t('common.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openConfirmDetail(row.id)">
              {{ t('schedule.checkDetail') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <p v-if="error" class="text-danger mt-16">{{ error }}</p>
    </div>

    <!-- Step 2：二次確認（一律不可編輯） -->
    <div v-else class="dialog-body-bg">
      <el-alert :title="t('schedule.confirmAsk')" type="warning" :closable="false" show-icon />
      <div class="info-section mt-16">
        <div class="info-title">{{ t('schedule.confirmTitle') }}</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="u-value num">{{ t('schedule.countUnit', { n: rows.length }) }}</div>
            <div class="u-label">{{ t('schedule.count') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value num">{{ fmtDate(form.startDate) }} 〜 {{ fmtDate(form.endDate) }}</div>
            <div class="u-label">{{ t('schedule.period') }}</div>
          </div>
          <div class="info-item">
            <div class="u-value">{{ t('schedule.firstRound') }}</div>
            <div class="u-label">{{ t('schedule.round') }}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-title">{{ t('schedule.confirmList') }}</div>
        <el-table :data="rows" size="small" stripe max-height="330">
          <el-table-column :label="t('vehicle.orderNo')" min-width="160" prop="orderNo" />
          <el-table-column :label="t('vehicle.plate')" min-width="140">
            <template #default="{ row }">{{ row.view.licensingPlateNumber }}</template>
          </el-table-column>
          <el-table-column :label="t('vehicle.makeSeries')" min-width="200">
            <template #default="{ row }">
              {{ row.view.makeName }} {{ row.view.seriesName }}
              <span class="text-muted">　{{ row.view.modelName }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 全有或全無：任一筆檢核不通過即整批都不上架 -->
      <el-alert
        v-if="rejected.length"
        type="error"
        :closable="false"
        show-icon
        :title="t('schedule.rejectedTitle')"
        class="mt-16"
      >
        <ul class="rejected">
          <li v-for="r in rejected" :key="r.orderNo">
            {{ r.orderNo }} —— {{ t(`schedule.reject.${r.reason}`) }}
          </li>
        </ul>
      </el-alert>
    </div>

    <template #footer>
      <el-button v-if="step === 2" @click="step = 1">{{ t('common.back') }}</el-button>
      <el-button v-else @click="close(false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="!rows.length" @click="next">
        {{ step === 1 ? t('common.confirm') : t('common.submit') }}
      </el-button>
    </template>

    <!-- 「確認詳細」—— 車輛詳細彈窗（車輛資料與附件全部唯讀）。關閉後回到本彈窗 -->
    <VehicleDetailDialog v-model="detailOpen" :vehicle-id="detailId" force-readonly append-to-body />
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import VehicleDetailDialog from './VehicleDetailDialog.vue'
import { vehicleView, scheduleAuctionBatch } from '@/shared/engine.js'
import { db, serverNow } from '@/shared/store.js'
import { fmtDate, today, addDays } from '@/shared/format.js'

const props = defineProps({ modelValue: Boolean, orderNos: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'done'])

const { t } = useI18n()
const step = ref(1)
const error = ref('')
const rejected = ref([])
const detailOpen = ref(false)
const detailId = ref('')
const form = reactive({ startDate: today(), endDate: addDays(today(), 7) })

const rows = computed(() =>
  props.orderNos
    .map((orderNo) => db.vehicles.find((v) => v.orderNo === orderNo))
    .filter(Boolean)
    .map((v) => ({ ...v, view: vehicleView(v) }))
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      step.value = 1
      error.value = ''
      rejected.value = []
      const base = dayjs(serverNow.value).format('YYYY-MM-DD')
      form.startDate = base
      form.endDate = addDays(base, 7)
    }
  }
)

const beforeToday = (date) => dayjs(date).isBefore(dayjs(serverNow.value), 'day')
const notAfterStart = (date) => !dayjs(date).isAfter(dayjs(form.startDate), 'day')

// キャンセルしても一覧の選択はクリアしない（本彈窗は選択を触らない）
function close(v) {
  emit('update:modelValue', v === true)
}

function openConfirmDetail(id) {
  detailId.value = id
  detailOpen.value = true
}

function next() {
  if (step.value === 1) {
    error.value = ''
    if (!form.startDate || !form.endDate) {
      error.value = t('common.required')
      return
    }
    if (dayjs(form.startDate).isBefore(dayjs(serverNow.value), 'day')) {
      error.value = t('schedule.errStart')
      return
    }
    if (!dayjs(form.endDate).isAfter(dayjs(form.startDate), 'day')) {
      error.value = t('schedule.errEnd')
      return
    }
    step.value = 2
    return
  }

  // 勾選的 orderNo 以陣列傳入、只打一支 API
  const res = scheduleAuctionBatch(
    rows.value.map((r) => r.orderNo),
    { startDate: form.startDate, endDate: form.endDate },
    db.internalUser.name
  )
  if (!res.ok) {
    rejected.value = res.rejected || []
    ElMessage.error(t('schedule.batchFailed'))
    return
  }
  rejected.value = []
  ElMessage.success(t('schedule.done', { n: res.rounds.length }))
  close(false)
  emit('done')
}
</script>

<style lang="scss" scoped>
.sub { font-size: 12px; line-height: 18px; }
.rejected {
  margin: 4px 0 0;
  padding-left: 18px;
  li { line-height: 22px; }
}
</style>
