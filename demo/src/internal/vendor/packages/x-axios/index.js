import axios from 'axios';
import md5 from 'js-md5';
import { createI18n } from './lang';
import { getLoginToken } from './utils/passport';
import { blobToString } from '../utils/tools';
// 手动导入 ElLoading/ElMessage 以防止未使用 unplugin-vue-components/unplugin-auto-import 的子应用报错
import { ElLoading, ElMessage } from 'element-plus';
import 'element-plus/es/components/loading/style/css';
import 'element-plus/es/components/message/style/css';

// Full config:  https://github.com/axios/axios#request-config
// axios.defaults.baseURL = process.env.baseURL || process.env.apiUrl || '';
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// axios.defaults.headers.token = getLoginToken();
// axios.defaults.headers.tenantId = "todoTenantId";
// axios.defaults.headers.account = "U1148637";
const config = {
  baseURL: process.env.NODE_ENV === 'development' ? '/' : '/api/',
  timeout: 60 * 1000
};

const { i18n, translate } = createI18n();
const langMap = {
  en: 'en',
  zhCn: 'zh-CN',
  ja: 'ja-JP'
};
let ajaxCount = 0;
let loading = null;

// console.log('[XStar] process.env.NODE_ENV', process.env.NODE_ENV);

const $axios = axios.create(config);

/** 业务成功码 */
export function isBizSuccess(code) {
  const c = code == null ? '' : String(code);
  return c === '0000';
}

$axios.interceptors.request.use(
  (config) => {
    // console.log("[XStar] request config: ", config);

    const options = config.config || {};

    if (options.headers) {
      for (const key in options.headers) {
        config.headers[key] = options.headers[key];
      }
    }

    let token = config.headers.token || getLoginToken();
    window.microApp && (token = token || window.microApp.getData().token);
    token && (config.headers.token = token);

    // md5加密盐`476ec1ee8735188a5fdb7c40644c05ff`
    const signTime = Date.now();
    config.headers.sign = md5(signTime + '476ec1ee8735188a5fdb7c40644c05ff');
    config.headers.signTime = signTime;

    const lang = sessionStorage.getItem('language') || 'ja';
    config.headers['Accept-Language'] = langMap[lang];
    i18n.locale = lang;

    ajaxCount += 1;
    if (!options.hideLoading) {
      loading = ElLoading.service({
        lock: true,
        text: options.loadingText || translate('loading'),
        background: 'rgba(0, 0, 0, 0)'
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
$axios.interceptors.response.use(
  (response) => {
    // console.log('[XStar] response: ', response);
    // 2xx 范围内的状态码都会触发该函数。
    ajaxCount > 0 && (ajaxCount -= 1);
    if (ajaxCount <= 0) {
      loading && loading.close();
    }

    const res = response.data;
    const options = response.config.config || {};
    const useFullResponse =
      response.headers['content-type']?.indexOf('application/octet-stream') !== -1 ||
      response.headers['content-type']?.indexOf('application/zip') !== -1 ||
      response.headers['content-type']?.indexOf('application/pdf') !== -1 ||
      response.headers['content-type']?.indexOf(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) !== -1 ||
      options.useFullResponse;
    if (!useFullResponse && !options.hideErrMsg && !isBizSuccess(res.code)) {
      window.microApp &&
        window.microApp.setGlobalData({
          data: res.code
        });
      ElMessage.error(res.message || 'Request failed');
    }
    if (response.request?.responseType === 'blob' && response.data?.type === 'application/json') {
      blobToString(response.data).then((str) => {
        const res = JSON.parse(str);
        if (res.code && !isBizSuccess(res.code)) {
          window.microApp &&
            window.microApp.setGlobalData({
              data: res.code
            });
          ElMessage.error(res.message || 'Request failed');
        }
      });
      throw new Error(res.message || 'Request failed');
    }
    if (
      ['1604', 401].includes(res.code) &&
      import.meta.env.VITE_APP_LOGIN_URL &&
      process.env.NODE_ENV === 'development'
    ) {
      window.location.href = `${import.meta.env.VITE_APP_LOGIN_URL}?target=${encodeURIComponent(window.location.href)}`;
    }
    // console.log("[XStar] useFullResponse, response: ", useFullResponse, useFullResponse ? response : res);
    return useFullResponse ? response : res;
  },
  (error) => {
    // console.log("[XStar] response error: ", error);
    // 超出 2xx 范围的状态码都会触发该函数。
    ajaxCount > 0 && (ajaxCount -= 1);
    if (ajaxCount <= 0) {
      loading && loading.close();
    }
    const hideErrMsg = error.config?.config?.hideErrMsg || false;
    if (error.response?.status === 401) {
      // 401 Unauthorized
      !hideErrMsg && ElMessage.error('Token is invalid.');
    } else if (error.response?.status === 408) {
      // 408 Request Timeout
      !hideErrMsg && ElMessage.error('Request Timeout.');
    } else if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
      !hideErrMsg && ElMessage.error(translate('message.timeout'));
    } else if (error.code !== 'ERR_CANCELED') {
      !hideErrMsg && ElMessage.error(translate('message.error'));
    }

    process.env.NODE_ENV === 'development' && console.info('[XStar] request error', error);

    return Promise.reject(error);
  }
);

export { axios, $axios };
// export default {
//   install: (app, options) => {
//     app.config.globalProperties.$axios = $axios;
//   }
// };
