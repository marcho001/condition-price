import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getPageButton } from '@/api/common';
import store from '@/store';
import { PERMISSION_PAGE_URL } from '@/common/constants';

/**
 * 页面权限
 *
 * getPageButton 返回 ";" 分隔的权限码字符串，拆成数组存入 permissionList，
 * 页面以 checkPermission([PERMISSION_CODE.xxx]) 判断，权限码见 @/common/constants 的 PERMISSION_CODE。
 */
export const usePermissionStore = defineStore('permission', () => {
  const permissionList = ref([]);
  const loaded = ref(false);

  /** 查询权限；失败时视为无任何权限，不阻塞路由 */
  const queryPermission = (pageUrl = PERMISSION_PAGE_URL) => {
    permissionList.value = [];
    return new Promise((resolve) => {
      getPageButton({ pageUrl })
        .then((res) => {
          res?.data && (permissionList.value = res.data.split(';').filter(Boolean));
        })
        .catch(() => {})
        .finally(() => {
          loaded.value = true;
          resolve();
        });
    });
  };

  /** 判断是否有权限；传空数组或非数组一律视为不限制 */
  const checkPermission = (value) => {
    if (!Array.isArray(value) || value.length === 0) {
      return true;
    }
    return value.some((val) => permissionList.value.includes(val));
  };

  return { permissionList, loaded, queryPermission, checkPermission };
});

export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
