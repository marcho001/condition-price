<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('schedule.title')"
    :width="step === 1 ? '520px' : '1120px'"
    top="6vh"
    @update:model-value="close"
  >
    <template v-if="vehicle">
      <!-- Step 1：期間入力 -->
      <div v-if="step === 1">
        <div class="target">
          <b>{{ vehicle.orderNo }}</b>
          <span>{{ view.licensingPlateNumber }}</span>
          <span>{{ view.makeName }} {{ view.seriesName }}</span>
        </div>
        <el-form label-position="top" style="margin-top: 12px">
          <el-form-item :label="t('schedule.startDate')" required>
            <el-date-picker
              v-model="form.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              :disabled-date="beforeToday"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item :label="t('schedule.endDate')" required>
            <el-date-picker
              v-model="form.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              :disabled-date="notAfterStart"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <el-alert :title="t('schedule.rule')" type="info" :closable="false" show-icon />
        <p v-if="error" class="text-danger mt-16">{{ error }}</p>
      </div>

      <!-- Step 2：二次確認（一律不可編輯） -->
      <div v-else class="dialog-body-bg">
        <el-alert :title="t('schedule.confirmHint')" type="warning" :closable="false" show-icon />
        <div class="info-section mt-16">
          <div class="info-title">{{ t('schedule.confirmTitle') }}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="u-value">{{ vehicle.orderNo }}</div>
              <div class="u-label">{{ t('vehicle.orderNo') }}</div>
            </div>
            <div class="info-item">
              <div class="u-value">{{ view.licensingPlateNumber }}</div>
              <div class="u-label">{{ t('vehicle.plate') }}</div>
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
        <VehicleInfoGrid :vehicle="vehicle" :editable="false" :lock-reason="t('schedule.confirmHint')" />
        <AttachmentPanel :vehicle="vehicle" :editable="false" />
      </div>
    </template>

    <template #footer>
      <el-button v-if="step === 2" @click="step = 1">{{ t('common.back') }}</el-button>
      <el-button v-else @click="close(false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="next">
        {{ step === 1 ? t('common.confirm') : t('common.submit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import VehicleInfoGrid from './VehicleInfoGrid.vue'
import AttachmentPanel from './AttachmentPanel.vue'
import { vehicleById, vehicleView, scheduleAuction } from '@/shared/engine.js'
import { db, serverNow } from '@/shared/store.js'
import { fmtDate, today, addDays } from '@/shared/format.js'

const props = defineProps({ modelValue: Boolean, vehicleId: String })
const emit = defineEmits(['update:modelValue', 'done'])

const { t } = useI18n()
const step = ref(1)
const error = ref('')
const form = reactive({ startDate: today(), endDate: addDays(today(), 7) })

const vehicle = computed(() => (props.vehicleId ? vehicleById(props.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      step.value = 1
      error.value = ''
      const base = dayjs(serverNow.value).format('YYYY-MM-DD')
      form.startDate = base
      form.endDate = addDays(base, 7)
    }
  }
)

const beforeToday = (date) => dayjs(date).isBefore(dayjs(serverNow.value), 'day')
const notAfterStart = (date) => !dayjs(date).isAfter(dayjs(form.startDate), 'day')

function close(v) {
  emit('update:modelValue', v === true)
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
  const res = scheduleAuction(
    props.vehicleId,
    { startDate: form.startDate, endDate: form.endDate },
    db.internalUser.name
  )
  if (!res.ok) {
    ElMessage.error(t('vehicle.mileageRequired'))
    return
  }
  ElMessage.success(t('schedule.done'))
  close(false)
  emit('done')
}
</script>

<style lang="scss" scoped>
.target {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 10px;
  font-size: 13px;
  color: #666;
  b { color: #222; font-size: 14px; }
}
</style>
