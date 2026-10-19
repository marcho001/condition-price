/**
 * @file 通用接口
 */
import { $axios } from '@/plugins/axios';

export function getDict(params, config = {}) {
  return $axios({
    url: '/approve/web/common/getDict',
    method: 'post',
    data: params,
    config
  });
}

// 车辆颜色（颜色不在字典内，由此取 colorId ↔ colorName）
export function getCarColor(params, config = {}) {
  return $axios({
    url: '/service-manager/api/ucp/getCarColor',
    method: 'get',
    params,
    config
  });
}

// 获取当前页面存在的按钮权限
export function getPageButton(param, config = {}) {
  return $axios({
    url: '/auth-core/resource/getPageButton',
    method: 'post',
    data: param,
    config
  });
}

// 上传附件
export function uploadFile(params, config = {}) {
  return $axios({
    url: '/approve/web/common/uploadFile',
    method: 'post',
    data: params,
    config
  });
}

// 下载上传的附件
export function downloadAttachment(params) {
  return $axios({
    url: '/approve/web/common/downloadFile',
    method: 'get',
    params,
    responseType: 'blob'
  });
}
