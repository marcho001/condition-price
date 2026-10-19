// import axios from 'axios';
import { axios, $axios } from '@packages/x-axios';
import { mockAdapter } from '@/mock';
import { isSilentRefresh } from '@/demo/sync';

// Demo：沒有後端，全部請求改由 mock adapter 交給共用的拍賣核心處理。
// x-axios 的攔截器（loading、錯誤 toast、isBizSuccess）維持原樣
$axios.defaults.adapter = mockAdapter;

$axios.interceptors.request.use(
  function (config) {
    if (process.env.NODE_ENV === 'development') {
      // config.headers.account = "U1148766";
      config.headers.token = 'WEB:V33Kzx1yregtze49a+ojru/fTK6bezEkADz8hC7L+dQwhH9d4MXTXJXRibKdc3j2';
    }
    // Demo：資料在背景變動（其他分頁、排程、Demo 控制台）而自動重新查詢時，不顯示全畫面 loading
    if (isSilentRefresh()) {
      config.config = { ...(config.config || {}), hideLoading: true };
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// $axios.interceptors.response.use(function(response) {
//   return response;
// }, function(error) {
//   return Promise.reject(error);
// });

export { axios, $axios };
export default {
  install: (app, options) => {
    app.config.globalProperties.$axios = $axios;
  }
};
