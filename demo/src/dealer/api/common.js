// 字典、顏色與廠牌選項（知識庫 API/auction-dealer-bidding/auction-dealer-bidding-dealer-site.yaml，tag: common）
import request from './request'

/** 車輛欄位用到的字典分類；key 與車輛欄位名相同。顏色不在字典內，見 getCarColor */
export const DICT_KEY = {
  FUEL_TYPE: 'fuelType', // 燃料の種類
  VEHICLE_USAGE_TYPE: 'vehicleUsageType', // 自家用・事業用の別
}

/**
 * 字典查詢，可一次查多個分類。不存在的分類不會報錯，回應中可能沒有該 key 或為空陣列。
 * 失敗時不跳 toast：畫面改顯示代碼即可，不影響操作
 * @param {string[]} dictKeys
 * @returns {Promise<Record<string, { dictKey: string, dictValue: string }[]>>}
 */
export function getDict(dictKeys) {
  return request.post('/auction/dealer/common/getDict', { dictKey: dictKeys }, { hideErrMsg: true })
}

/**
 * 顏色選項：車輛 `color` 欄位存的是 colorId。失敗時不跳 toast，畫面改顯示代碼
 * @returns {Promise<{ colorId: string, colorName: string }[]>}
 */
export function getCarColor() {
  return request.post('/auction/dealer/common/getCarColor', null, { hideErrMsg: true })
}

/**
 * 廠牌篩選的選項：列出全部廠牌，不限列表上現有的車（規格 5.2）；後端已排序，照回傳順序顯示
 * @returns {Promise<{ makeId: string, makeName: string }[]>}
 */
export function getMakes() {
  return request.post('/auction/dealer/common/getMakes')
}
