/**
 * @file 车辆拍卖 — 排定拍卖与拍卖管理
 * 对齐 japan-knowledge/API：
 *   - auction-scheduling/auction-scheduling-portal.yaml（排定拍卖、取消排定、待开始／拍卖进行中／已结标列表）
 *   - auction-urge/auction-urge-portal.yaml（催投）
 *   - auction-award/auction-award-portal.yaml（出价纪录、指定成交厂商、进入加价拍卖、已决标列表）
 * servers: /auction（服务 context-path）
 *
 * 「车辆详细」弹窗的拍卖信息（auctionInfo）走 @/api/vehicle 的 getVehicleDetail。
 */
import { $axios } from '@/plugins/axios';

const BASE = '/auction/web/auction';

/**
 * 排定拍卖（批次）
 *
 * 全有或全无：任一台检核不通过即整批不上架，code=1301 时 data.failures 列出全部不通过的车辆与原因。
 * 开始日为今天 → auctionStatus=20 投标中；开始日在未来 → auctionStatus=15 待开始。
 *
 * @param {Object} data { orderNos: string[], startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 */
export function scheduleAuction(data) {
  return $axios({
    url: `${BASE}/schedule`,
    method: 'post',
    data,
    config: { hideErrMsg: true }
  });
}

/**
 * 取消排定（仅催收人员；首轮退回车辆管理、加价轮退回已结标）
 * @param {Object} data { roundId }
 */
export function cancelSchedule(data) {
  return $axios({
    url: `${BASE}/schedule/cancel`,
    method: 'post',
    data,
    config: { hideErrMsg: true }
  });
}

/**
 * 待开始列表（依开始日由早到晚）
 * @param {Object} data orderNo / licensingPlateNumber / roundType / startDateFrom / startDateTo / pageNo / pageSize
 */
export function getPendingAuctionList(data) {
  return $axios({
    url: `${BASE}/pending/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 拍卖进行中列表（依收车日由近到远；不回任何出价金额，bidCount 只有家数）
 * @param {Object} data 同 getPendingAuctionList
 */
export function getOngoingAuctionList(data) {
  return $axios({
    url: `${BASE}/ongoing/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 已结标列表（依结标日由近到远；仅催收人员）
 * @param {Object} data 同 getPendingAuctionList
 */
export function getClosedAuctionList(data) {
  return $axios({
    url: `${BASE}/closed/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 已决标列表（依成交时间由近到远）
 * @param {Object} data orderNo / licensingPlateNumber / roundType / dealerIds / pageNo / pageSize
 */
export function getAwardedAuctionList(data) {
  return $axios({
    url: `${BASE}/awarded/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 催投弹窗资讯：本轮未出价厂商与催投纪录（仅催收人员）
 * @param {Object} data { vehicleId }
 */
export function getUrgeInfo(data) {
  return $axios({
    url: `${BASE}/urge/info`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 手动催投（仅催收人员；对象于送出当下重新计算）
 * @param {Object} data { vehicleId }
 */
export function urgeBid(data) {
  return $axios({
    url: `${BASE}/urge`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 出价纪录（已结标为本轮一笔；已决标为各轮）
 * @param {Object} data { vehicleId }
 */
export function getBidRecords(data) {
  return $axios({
    url: `${BASE}/bid-records`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 指定成交厂商（成交金额＝该厂商本轮有效出价，request 不带金额）
 * 贷后成交通知成功才转入已决标；失败时 code=1501，订单仍在已结标
 * @param {Object} data { vehicleId, roundId, dealerId }
 */
export function designateDealer(data) {
  return $axios({
    url: `${BASE}/designate`,
    method: 'post',
    data,
    config: { hideErrMsg: true }
  });
}

/**
 * 进入加价拍卖（起标价＝前一轮最高出价；只有被勾选的厂商看得到这一轮）
 * @param {Object} data { vehicleId, roundId, startDate, endDate, dealerIds }
 */
export function startAdditionalRound(data) {
  return $axios({
    url: `${BASE}/additional-round`,
    method: 'post',
    data,
    config: {}
  });
}
