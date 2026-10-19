/**
 * @file 车辆拍卖 — 厂商管理
 * 对齐 japan-knowledge/API/auction-dealer-management/auction-dealer-management-portal.yaml
 * servers: /auction（服务 context-path）
 */
import { $axios } from '@/plugins/axios';

const BASE = '/auction/web/dealer';

/**
 * 厂商列表（不分页，依建档时间由新到旧）
 * @param {Object} data { dealerName, contactName, enableFlag }
 */
export function getDealerList(data) {
  return $axios({
    url: `${BASE}/list`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 新增／编辑厂商
 * id 为 null 表新增：默认启用、同步开通对外站账号并寄送账号开通信
 * id 有值表编辑：可修改 Email（登入账号），密码不变、不重发通知
 * @param {Object} data { id, dealerName, contactName, phone, email, remark }
 */
export function saveDealer(data) {
  return $axios({
    url: `${BASE}/save`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 停用／启用厂商（不删除资料）
 * @param {Object} data { id, enableFlag }
 */
export function toggleDealerStatus(data) {
  return $axios({
    url: `${BASE}/toggle-status`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 重设厂商密码：产生新密码并寄至登入 Email，旧密码即刻失效，不解除账号锁定
 * @param {Object} data { id }
 */
export function resetDealerPassword(data) {
  return $axios({
    url: `${BASE}/reset-password`,
    method: 'post',
    data,
    config: {}
  });
}

/**
 * 解锁厂商账号：解除因登入连续错误 5 次而锁定的账号，错误次数归零，不变更密码
 * @param {Object} data { id }
 */
export function unlockDealer(data) {
  return $axios({
    url: `${BASE}/unlock`,
    method: 'post',
    data,
    config: {}
  });
}
