import { createRouter, createWebHashHistory } from 'vue-router'
import { LIST_SCOPE } from '@/api/auction'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'auction-list' } },
      // 三個列表共用同一個頁面元件，以 scope 區分（規格 1.1 原則 11）
      {
        path: 'auctions',
        name: 'auction-list',
        component: () => import('@/views/AuctionListView.vue'),
        props: { scope: LIST_SCOPE.OPEN },
      },
      {
        path: 'my-bids',
        name: 'my-bids',
        component: () => import('@/views/AuctionListView.vue'),
        props: { scope: LIST_SCOPE.MY_BIDS },
      },
      {
        path: 'won',
        name: 'won',
        component: () => import('@/views/AuctionListView.vue'),
        props: { scope: LIST_SCOPE.WON },
      },
      // Demo：engine 的 roundId 為字串（例：R2591-1），因此不轉成 Number
      // 詳細頁也共用同一個元件（規格 6.1）。投標中與已得標打不同的 API，因此分成兩個路由；
      // 投標中的 from 記錄從拍賣列表或我的拍賣進入，決定返回目標
      {
        path: 'auctions/:roundId',
        name: 'auction-detail',
        component: () => import('@/views/VehicleDetailView.vue'),
        props: (route) => ({ roundId: route.params.roundId, won: false }),
      },
      {
        path: 'won/:roundId',
        name: 'won-detail',
        component: () => import('@/views/VehicleDetailView.vue'),
        props: (route) => ({ roundId: route.params.roundId, won: true }),
      },
      {
        path: 'notices',
        name: 'notices',
        component: () => import('@/views/NoticeView.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'auction-list' } },
]

const router = createRouter({
  // Demo 頁面為 /dealer.html，改用 hash 模式（正式站為 createWebHistory(BASE_URL)）
  history: createWebHashHistory(),
  routes,
  scrollBehavior: (to, from, savedPosition) => savedPosition ?? { top: 0 },
})

// 未登入不揭露任何車輛資訊，一律導向登入頁（規格 四）
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isLoggedIn()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isLoggedIn()) {
    return { name: 'auction-list' }
  }
})

export default router
