import { defineStore } from 'pinia'
import { reactive } from 'vue'

/** 篩選彈窗內的條件（規格 5.2）；年份與里程皆可只填其一。欄位名與 API 參數相同 */
export const createEmptyFilters = () => ({
  vin: '',
  makeIds: [],
  carYearFrom: '',
  carYearTo: '',
  mileageFrom: '',
  mileageTo: '',
})

// 拍賣列表、我的拍賣、已得標各自保留自己的篩選條件，切換列表互不影響（規格 5.2）。
// 頁面在列表間切換時會重新建立（見 MainLayout），因此條件存在 store，而不是頁面元件裡。
export const useListFiltersStore = defineStore('listFilters', () => {
  const byScope = reactive({})

  /** 取得該列表的篩選狀態；第一次進入時建立空條件 */
  function forScope(scope) {
    byScope[scope] ??= { filters: createEmptyFilters(), quickFilter: null }
    return byScope[scope]
  }

  return { forScope }
})
