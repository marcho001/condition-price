import { createRouter, createWebHashHistory } from 'vue-router';
import { getDict } from '@/api/common';
import dictionaryKeys from '@/common/constants/dictionaryKeys';
import { useDictStoreHook } from '@/store/modules/dict';
import { usePermissionStoreHook } from '@/store/modules/permission';
import { useVehicleSelectionStoreHook } from '@/store/modules/vehicleSelection';
import { isBizSuccess } from '@packages/x-axios';

const dictStore = useDictStoreHook();
const { setDict } = dictStore;
const permissionStore = usePermissionStoreHook();
const vehicleSelectionStore = useVehicleSelectionStoreHook();

const routes = [
  {
    path: '/',
    name: 'index',
    alias: '/home',
    redirect: '/auction-management/vehicleManagement/list',
    meta: {
      title: 'XStar'
    }
  },
  // 车辆拍卖 → 车辆管理
  {
    path: '/auction-management/vehicleManagement/list',
    name: 'auction-vehicle-list',
    component: () => import('../views/vehicleManagement/list.vue'),
    meta: {
      title: 'Vehicle Management'
    }
  },
  // 车辆拍卖 → 拍卖管理
  {
    path: '/auction-management/auctionManagement/list',
    name: 'auction-auction-list',
    component: () => import('../views/auctionManagement/index.vue'),
    meta: {
      title: 'Auction Management'
    }
  },
  // 车辆拍卖 → 厂商管理
  {
    path: '/auction-management/dealerManagement/list',
    name: 'auction-dealer-list',
    component: () => import('../views/dealerManagement/list.vue'),
    meta: {
      title: 'Dealer Management'
    }
  }
];
const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  if (process.env.NODE_ENV === 'development' && to.query?.token) {
    sessionStorage.setItem('token', decodeURIComponent(to.query.token || ''));
  }
  // 离开车辆管理列表时清空批次勾选（规格 4.5.1）
  if (from.name === 'auction-vehicle-list' && to.name !== 'auction-vehicle-list') {
    vehicleSelectionStore.clear();
  }
  const tasks = [
    getDict({ dictKey: dictionaryKeys })
      .then((res) => {
        if (isBizSuccess(res?.code)) {
          setDict(res.data);
        }
      })
      .catch(() => {})
  ];
  if (!permissionStore.loaded) {
    tasks.push(permissionStore.queryPermission());
  }
  Promise.all(tasks).then(() => {
    next();
  });
});

export default router;
