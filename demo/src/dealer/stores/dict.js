import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DICT_KEY, getCarColor, getDict } from '@/api/common'

// 車輛的代碼欄位 API 只回代碼，顯示名由這裡對應：
//   燃料の種類、自家用・事業用の別 → 字典（getDict）；ボディカラー → 顏色選項（getCarColor）。
// 整站共用一份，登入後只取一次；兩支各自載入，取得失敗時下次 load() 再試。
export const useDictStore = defineStore('dict', () => {
  /** { [字典分類]: { [代碼]: 顯示名 } } */
  const dictLabels = ref({})
  /** { [colorId]: colorName } */
  const colorLabels = ref({})

  const loadDict = createLoader(
    () => getDict(Object.values(DICT_KEY)),
    (data) => {
      dictLabels.value = Object.fromEntries(
        Object.entries(data || {}).map(([category, items]) => [category, toLabelMap(items, 'dictKey', 'dictValue')]),
      )
    },
  )
  const loadColors = createLoader(getCarColor, (data) => {
    colorLabels.value = toLabelMap(data, 'colorId', 'colorName')
  })

  function load() {
    return Promise.all([loadDict(), loadColors()])
  }

  // 對不到（或尚未載入）時顯示原始代碼
  function dictLabel(category, code) {
    return dictLabels.value[category]?.[code] ?? code
  }

  function colorLabel(code) {
    return colorLabels.value[code] ?? code
  }

  return { load, dictLabel, colorLabel }
})

/** 只取一次；失敗時清掉快取，下次呼叫再試 */
function createLoader(fetch, onLoaded) {
  let promise = null
  return () => {
    promise ??= fetch()
      .then(onLoaded)
      .catch(() => {
        promise = null
      })
    return promise
  }
}

function toLabelMap(items, codeKey, labelKey) {
  return Object.fromEntries((items || []).map((item) => [item[codeKey], item[labelKey]]))
}
