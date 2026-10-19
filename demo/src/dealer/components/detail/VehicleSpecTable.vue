<script setup>
// 車輛資料表（規格 6.1；欄位見知識庫 domain/models/auction-vehicle.md）。
// V2.7 起不呈現「次回車検日」「自賠責保険の有効期限」
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DICT_KEY } from '@/api/common'
import { formatDate, formatNumber } from '@/utils/format'
import { useDictStore } from '@/stores/dict'

const props = defineProps({
  vehicle: { type: Object, required: true },
})
const { t } = useI18n()
const { dictLabel, colorLabel } = useDictStore()

const FIELDS = [
  { key: 'makeName' },
  { key: 'seriesName' },
  { key: 'yearName' },
  { key: 'modelName' },
  { key: 'carYear' },
  { key: 'color', format: colorLabel },
  { key: 'fuelType', format: (v) => dictLabel(DICT_KEY.FUEL_TYPE, v) },
  { key: 'displacement' },
  { key: 'mileage', format: (v) => `${formatNumber(v)} km` },
  { key: 'vin' },
  { key: 'licensingPlateNumber' },
  { key: 'productDate', format: formatDate },
  // 初度登録年月：API 回完整日期，只顯示到年月
  { key: 'registeDate', format: (v) => dayjs(v).format('YYYY/MM') },
  { key: 'vehicleUsageType', format: (v) => dictLabel(DICT_KEY.VEHICLE_USAGE_TYPE, v) },
  { key: 'transferCount' },
]

const rows = computed(() =>
  FIELDS.map(({ key, format }) => {
    const raw = props.vehicle[key]
    const empty = raw === null || raw === undefined || raw === ''
    return { key, label: t(`vehicle.${key}`), value: empty ? t('common.none') : format ? format(raw) : raw }
  }),
)
</script>

<template>
  <dl class="spec-table grid overflow-hidden rounded-2xl border border-line bg-white">
    <template v-for="row in rows" :key="row.key">
      <dt class="bg-page p-4 text-sm text-ink-regular">{{ row.label }}</dt>
      <dd class="p-4 text-sm font-semibold break-all text-ink">{{ row.value }}</dd>
    </template>
  </dl>
</template>

<style scoped>
/* 手機一欄（標籤＋值），PC 兩欄並排 */
.spec-table {
  grid-template-columns: 140px 1fr;
}
.spec-table > * {
  border-bottom: 1px solid var(--color-divider);
}
@media (min-width: 768px) {
  .spec-table {
    grid-template-columns: 200px 1fr 200px 1fr;
  }
}
</style>
