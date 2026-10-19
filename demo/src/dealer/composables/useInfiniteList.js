import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onDemoDataChanged } from '@/demo/runtime'

const PAGE_SIZE = 12

/**
 * 無限滾動列表（規格 5.2：不做分頁）。
 * 在列表底部放一個 `sentinel` 元素，滾到看得見時自動載入下一頁。
 *
 * @param {(page: { pageNo: number, pageSize: number }) => Promise<{ records: any[], total: number }>} fetchPage
 */
export function useInfiniteList(fetchPage) {
  const list = ref([])
  const total = ref(0)
  const loading = ref(false)
  const finished = ref(false)
  const sentinel = ref(null)
  let pageNo = 0
  let requestId = 0 // 條件變更後，丟棄還在路上的舊請求結果

  async function loadMore() {
    if (loading.value || finished.value) return
    loading.value = true
    const currentRequest = requestId
    try {
      const data = await fetchPage({ pageNo: pageNo + 1, pageSize: PAGE_SIZE })
      if (currentRequest !== requestId) return
      pageNo += 1
      list.value.push(...data.records)
      total.value = data.total
      finished.value = list.value.length >= data.total
    } catch {
      finished.value = true // 失敗時停止自動重試，錯誤 toast 由 request 攔截器處理
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
    if (currentRequest === requestId) loadMoreIfSentinelVisible()
  }

  // IntersectionObserver 只在 sentinel「進出畫面」時通知。一頁資料不夠填滿畫面時，
  // sentinel 載入後仍在畫面內、不會再收到通知，因此每載完一頁就檢查一次，仍看得到就接著載下一頁
  async function loadMoreIfSentinelVisible() {
    await nextTick() // 等新資料渲染完，sentinel 才是最新位置
    const rect = sentinel.value?.getBoundingClientRect()
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) loadMore()
  }

  function reset() {
    requestId += 1
    pageNo = 0
    list.value = []
    total.value = 0
    finished.value = false
    loading.value = false
    return loadMore()
  }

  // Demo：共用資料變動時（另一分頁操作、排程結標…），以同樣的條件重新取回目前已載入的範圍，
  // 一次替換列表，不清空畫面、不捲回頂端，篩選與開著的彈窗都不受影響
  async function refresh() {
    if (loading.value || pageNo === 0) return
    const currentRequest = requestId
    try {
      // pageSize 上限 50，因此逐頁取回已載入的頁數
      const pages = []
      for (let n = 1; n <= pageNo; n += 1) pages.push(await fetchPage({ pageNo: n, pageSize: PAGE_SIZE }))
      if (currentRequest !== requestId || loading.value) return
      list.value = pages.flatMap((data) => data.records)
      total.value = pages.at(-1).total
      finished.value = list.value.length >= total.value
    } catch {
      // 失敗時維持原畫面，錯誤 toast 由 request 攔截器處理
    }
  }
  const stopDemoSync = onDemoDataChanged(refresh)

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore()
  })
  watch(sentinel, (el, oldEl) => {
    if (oldEl) observer.unobserve(oldEl)
    if (el) observer.observe(el)
  })
  onBeforeUnmount(() => {
    observer.disconnect()
    stopDemoSync()
  })

  return { list, total, loading, finished, sentinel, reset }
}
