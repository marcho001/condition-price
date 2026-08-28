<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('auction.extraTitle')"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="prev">
      <div class="target">
        <b>{{ vehicle.orderNo }}</b>
        <span>{{ view.makeName }} {{ view.seriesName }}</span>
        <span>{{ t('auction.roundN', { n: prev.round + 1 }) }}</span>
      </div>

      <el-form label-position="top" style="margin-top: 12px">
        <el-form-item :label="t('auction.extraStartPrice')">
          <div class="start-price num">{{ yenJa(startPrice) }}</div>
          <p v-if="!startPrice" class="section-hint" style="margin: 6px 0 0">
            {{ t('auction.extraStartPriceZero') }}
          </p>
        </el-form-item>
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
        <el-form-item :label="t('auction.extraInvitee')" required>
          <p class="section-hint" style="margin: 0 0 8px">{{ t('auction.extraInviteeHint') }}</p>
          <el-checkbox-group v-model="form.inviteeIds" class="invitee-list">
            <el-checkbox v-for="d in dealers" :key="d.id" :value="d.id" border>
              {{ d.name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <p v-if="error" class="text-danger">{{ error }}</p>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submit">{{ t('common.submit') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import {
  vehicleById,
  vehicleView,
  latestRound,
  highestOfRound,
  activeDealers,
  startExtraRound
} from '@/shared/engine.js'
import { db, serverNow } from '@/shared/store.js'
import { yenJa, addDays } from '@/shared/format.js'

const props = defineProps({ modelValue: Boolean, vehicleId: String })
const emit = defineEmits(['update:modelValue', 'done'])

const { t } = useI18n()
const error = ref('')
const form = reactive({ startDate: '', endDate: '', inviteeIds: [] })

const vehicle = computed(() => (props.vehicleId ? vehicleById(props.vehicleId) : null))
const view = computed(() => vehicleView(vehicle.value))
const prev = computed(() => (vehicle.value ? latestRound(vehicle.value.id) : null))
const startPrice = computed(() => (prev.value ? highestOfRound(prev.value.id).amount || 0 : 0))
const dealers = computed(() => activeDealers())

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    error.value = ''
    const base = dayjs(serverNow.value).format('YYYY-MM-DD')
    form.startDate = base
    form.endDate = addDays(base, 7)
    form.inviteeIds = dealers.value.map((d) => d.id) // 既定は全選択
  }
)

const beforeToday = (date) => dayjs(date).isBefore(dayjs(serverNow.value), 'day')
const notAfterStart = (date) => !dayjs(date).isAfter(dayjs(form.startDate), 'day')

function submit() {
  error.value = ''
  if (!form.startDate || !form.endDate) {
    error.value = t('common.required')
    return
  }
  if (!dayjs(form.endDate).isAfter(dayjs(form.startDate), 'day')) {
    error.value = t('schedule.errEnd')
    return
  }
  if (!form.inviteeIds.length) {
    error.value = t('auction.extraInviteeRequired')
    return
  }
  startExtraRound(props.vehicleId, { ...form }, db.internalUser.name)
  ElMessage.success(t('auction.extraDone'))
  emit('update:modelValue', false)
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
.start-price {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-color-primary);
}
.invitee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  :deep(.el-checkbox) { margin-right: 0; width: 100%; }
}
</style>
