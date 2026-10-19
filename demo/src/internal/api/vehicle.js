/**
 * @file 车辆拍卖 — 车辆管理
 * 对齐 japan-knowledge/API/auction-vehicle-management/auction-vehicle-management-portal.yaml
 * servers: /auction（服务 context-path）
 */
import { $axios } from '@/plugins/axios';

const BASE = '/auction/web/vehicle';

/**
 * 车辆管理列表（只回「待排定拍卖」，依收车日由近到远）
 * @param {Object} data orderNo / licensingPlateNumber / receivedAtStart / receivedAtEnd / pageNo / pageSize
 */
export function getVehicleList(data) {
  return $axios({
    url: `${BASE}/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 车辆详细（车辆资料 + 附件）
 * @param {Object} data { id }
 */
export function getVehicleDetail(data) {
  return $axios({
    url: `${BASE}/detail`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 更新收车现况，只能更新 mileage / remark
 * 两个字段皆可传 null 表示清空
 * @param {Object} data { id, mileage, remark }
 */
export function updateVehicleCondition(data) {
  return $axios({
    url: `${BASE}/update-condition`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 上传附件（multipart: vehicleId + file）
 * 上传先后顺序即对外站车辆详细页的呈现顺序
 */
export function uploadVehicleAttachment(formData, config = {}) {
  return $axios({
    url: `${BASE}/attachment/upload`,
    method: 'post',
    data: formData,
    config: {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    }
  });
}

/**
 * 删除附件
 * @param {Object} data { vehicleId, attachmentId }
 */
export function deleteVehicleAttachment(data) {
  return $axios({
    url: `${BASE}/attachment/delete`,
    method: 'post',
    data,
    config: {}
  });
}
