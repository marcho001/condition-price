<template>
  <div class="info-section">
    <div class="info-title">
      {{ t('vehicle.sectionInfo') }}
      <el-tag v-if="!editable" type="info" size="small" effect="plain">{{ lockText }}</el-tag>
    </div>
    <p v-if="editable" class="section-hint">{{ t('vehicle.editHint') }}</p>

    <div class="info-grid">
      <div
        v-for="f in fields"
        :key="f.key"
        class="info-item"
        :class="{ 'is-full': f.full }"
      >
        <div class="u-value">
          <template v-if="editing === f.key">
            <el-date-picker
              v-if="f.type === 'date'"
              v-model="draft"
              type="date"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
              @change="commit(f)"
            />
            <el-input
              v-else-if="f.type === 'textarea'"
              v-model="draft"
              type="textarea"
              :rows="2"
              size="small"
              maxlength="200"
              show-word-limit
              @blur="commit(f)"
            />
            <el-input
              v-else
              v-model="draft"
              size="small"
              style="max-width: 180px"
              @keyup.enter="commit(f)"
              @blur="commit(f)"
            >
              <template #append>km</template>
            </el-input>
          </template>
          <template v-else>
            <span :class="{ 'text-muted': isEmpty(f) }">{{ display(f) }}</span>
            <el-icon v-if="editable && f.editable" class="edit-pen" @click="startEdit(f)">
              <EditPen />
            </el-icon>
          </template>
        </div>
        <div class="u-label">
          {{ label(f) }}
          <el-tag v-if="f.editable" size="small" effect="plain" class="editable-tag">
            {{ locale === 'zh' ? '可編輯' : '更新可' }}
          </el-tag>
        </div>
        <div v-if="f.key === 'mileage' && !view.mileage" class="mileage-hint">
          {{ t('vehicle.mileageIntake', { range: vehicle.intake.mileageRange || '—' }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VEHICLE_FIELDS } from '@/shared/constants.js'
import { vehicleView, updateVehicleFields } from '@/shared/engine.js'
import { db } from '@/shared/store.js'
import { km, fmtDate, fmtMonth, na } from '@/shared/format.js'

const props = defineProps({
  vehicle: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  lockReason: { type: String, default: '' }
})

const { t, locale } = useI18n()
const fields = VEHICLE_FIELDS
const view = computed(() => vehicleView(props.vehicle))
const lockText = computed(() => props.lockReason || t('common.readonly'))

const editing = ref(null)
const draft = ref('')

const label = (f) => (locale.value === 'zh' ? f.zh : f.ja)

function isEmpty(f) {
  const v = view.value[f.key]
  return v === undefined || v === null || v === ''
}

function display(f) {
  const v = view.value[f.key]
  if (f.key === 'mileage') return v ? km(v) : '—'
  if (f.type === 'date') return fmtDate(v)
  if (f.type === 'month') return fmtMonth(v)
  return na(v)
}

function startEdit(f) {
  editing.value = f.key
  draft.value = view.value[f.key] ?? ''
}

function commit(f) {
  if (editing.value !== f.key) return
  const raw = draft.value
  const next = f.key === 'mileage' ? String(raw).replace(/[^\d]/g, '') : raw
  updateVehicleFields(props.vehicle.id, { [f.key]: next }, db.internalUser.name)
  editing.value = null
}
</script>

<style lang="scss" scoped>
.editable-tag {
  margin-left: 6px;
  transform: scale(0.86);
  transform-origin: left center;
}
.mileage-hint {
  font-size: 12px;
  color: #e6a23c;
  line-height: 18px;
  margin-top: 2px;
}
</style>
