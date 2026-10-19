<script setup>
// 篩選條件彈窗（Figma：筛选弹窗）。車台番号、廠牌、年份、里程（規格 5.2）；
// 「新着出品／締切間近」不在彈窗內，見 QuickFilterChips
import { reactive, ref, watch } from 'vue'
import { getMakes } from '@/api/common'
import { createEmptyFilters } from '@/stores/listFilters'
import AppDialog from './AppDialog.vue'

const props = defineProps({
  filters: { type: Object, required: true },
})
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['apply', 'clear'])

const form = reactive(createEmptyFilters())
const mileageError = ref('')

// 廠牌選項列出全部廠牌，第一次打開彈窗時載入
const makerOptions = ref([])
async function loadMakerOptions() {
  if (makerOptions.value.length) return
  try {
    makerOptions.value = await getMakes()
  } catch {
    // 錯誤 toast 由 request 攔截器處理；下次打開再試
  }
}

// 打開時帶入目前條件；在彈窗中修改，按「適用する」才生效
watch(visible, (open) => {
  if (!open) return
  Object.assign(form, props.filters, { makeIds: [...props.filters.makeIds] })
  mileageError.value = ''
  loadMakerOptions()
})

// 年份選擇器不可選出起晚於迄的組合
const yearOf = (date) => date.getFullYear()
const disableYearFrom = (date) => Boolean(form.carYearTo) && yearOf(date) > Number(form.carYearTo)
const disableYearTo = (date) => Boolean(form.carYearFrom) && yearOf(date) < Number(form.carYearFrom)

// 里程只接受 0 以上的整數
function onMileageInput(key, value) {
  form[key] = value.replace(/\D/g, '')
  mileageError.value = ''
}

function apply() {
  const { mileageFrom, mileageTo } = form
  if (mileageFrom !== '' && mileageTo !== '' && Number(mileageFrom) > Number(mileageTo)) {
    mileageError.value = 'list.mileageRangeError'
    return
  }
  emit('apply', { ...form, vin: form.vin.trim(), makeIds: [...form.makeIds] })
  visible.value = false
}

function clear() {
  emit('clear')
  visible.value = false
}
</script>

<template>
  <AppDialog v-model="visible" :title="$t('list.filterTitle')">
    <el-form label-position="top" class="filter-form" @submit.prevent="apply">
      <el-form-item :label="$t('list.vin')">
        <el-input v-model="form.vin" :placeholder="$t('list.vinPh')" clearable />
      </el-form-item>

      <el-form-item :label="$t('list.maker')">
        <el-select
          v-model="form.makeIds"
          :placeholder="$t('list.makerPh')"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option v-for="maker in makerOptions" :key="maker.makeId" :label="maker.makeName" :value="maker.makeId" />
        </el-select>
      </el-form-item>

      <el-form-item :label="$t('list.year')">
        <div class="range-row">
          <el-date-picker
            v-model="form.carYearFrom"
            type="year"
            value-format="YYYY"
            :placeholder="$t('list.yearFrom')"
            :disabled-date="disableYearFrom"
            clearable
          />
          <span class="range-sep">〜</span>
          <el-date-picker
            v-model="form.carYearTo"
            type="year"
            value-format="YYYY"
            :placeholder="$t('list.yearTo')"
            :disabled-date="disableYearTo"
            clearable
          />
        </div>
      </el-form-item>

      <el-form-item :label="$t('list.mileage')" :error="mileageError ? $t(mileageError) : ''">
        <div class="range-row">
          <el-input
            :model-value="form.mileageFrom"
            inputmode="numeric"
            :placeholder="$t('list.mileageMin')"
            clearable
            @update:model-value="onMileageInput('mileageFrom', $event)"
          />
          <span class="range-sep">〜</span>
          <el-input
            :model-value="form.mileageTo"
            inputmode="numeric"
            :placeholder="$t('list.mileageMax')"
            clearable
            @update:model-value="onMileageInput('mileageTo', $event)"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="clear">{{ $t('common.clear') }}</el-button>
      <el-button type="primary" @click="apply">{{ $t('common.apply') }}</el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
.filter-form :deep(.el-form-item) {
  margin-bottom: 20px;
}
.filter-form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
/* 最後一欄出現錯誤訊息時，留出與按鈕之間的距離 */
.filter-form :deep(.el-form-item.is-error:last-child) {
  margin-bottom: 20px;
}
.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper) {
  min-height: 40px;
}
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.range-row > :not(.range-sep) {
  flex: 1;
  min-width: 0;
}
.range-row :deep(.el-date-editor.el-input) {
  width: 100%;
}
.range-sep {
  color: var(--color-ink-hint);
}
</style>
