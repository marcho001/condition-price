import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { vehicleView, bidOf } from '@/shared/engine.js'
import { db } from '@/shared/store.js'

const PAGE = 6

function inMileageBucket(mileage, bucket) {
  const m = Number(mileage || 0)
  if (bucket === 'u3') return m < 30000
  if (bucket === '3-6') return m >= 30000 && m < 60000
  if (bucket === '6-10') return m >= 60000 && m < 100000
  if (bucket === 'o10') return m >= 100000
  return true
}

export const blankFilter = () => ({ keyword: '', year: '', mileage: '', color: '', bidState: '' })

/**
 * 出品一覧・入札中・落札済みで共用する絞り込み＋無限スクロール。
 * 絞り込みはカードに出ている車両データ（メーカー・車種／年式／走行距離／色）が対象。
 * 「入札状況」は出品一覧のみで有効（入札中・落札済みでは適用しない）。
 */
export function useCardList(rows, { withBidState = true } = {}) {
  const filter = ref(blankFilter())
  const shown = ref(PAGE)
  const sentinel = ref(null)

  const decorated = computed(() => rows.value.map((r) => ({ ...r, view: r.view || vehicleView(r.vehicle) })))

  const years = computed(() => [...new Set(decorated.value.map((r) => r.view.carYear))].sort().reverse())
  const colors = computed(() => [...new Set(decorated.value.map((r) => r.view.color))])

  const activeCount = computed(
    () =>
      Object.entries(filter.value).filter(([k, v]) => v && (withBidState || k !== 'bidState')).length
  )

  const filtered = computed(() => {
    const f = filter.value
    return decorated.value.filter((r) => {
      if (f.keyword) {
        const s = `${r.view.makeName} ${r.view.seriesName} ${r.view.modelName}`.toLowerCase()
        if (!s.includes(f.keyword.toLowerCase())) return false
      }
      if (f.year && r.view.carYear !== f.year) return false
      if (f.color && r.view.color !== f.color) return false
      if (f.mileage && !inMileageBucket(r.view.mileage, f.mileage)) return false
      if (withBidState && f.bidState && r.round) {
        const has = !!bidOf(r.round.id, db.dealerSession)
        if (f.bidState === 'yes' && !has) return false
        if (f.bidState === 'no' && has) return false
      }
      return true
    })
  })

  const visible = computed(() => filtered.value.slice(0, shown.value))

  watch(filter, () => {
    shown.value = PAGE
  })

  // ページャーは設けず無限スクロール
  let io = null
  onMounted(() => {
    io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && shown.value < filtered.value.length) shown.value += PAGE
    })
    if (sentinel.value) io.observe(sentinel.value)
  })
  onUnmounted(() => io?.disconnect())

  return { filter, filtered, visible, years, colors, activeCount, sentinel }
}
