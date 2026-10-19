import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/vehicles' },
  {
    path: '/vehicles',
    name: 'vehicles',
    component: () => import('./views/VehicleList.vue'),
    meta: { menu: 'vehicle' }
  },
  {
    path: '/auctions',
    name: 'auctions',
    component: () => import('./views/AuctionManage.vue'),
    meta: { menu: 'auction' }
  },
  {
    path: '/dealers',
    name: 'dealers',
    component: () => import('./views/DealerManage.vue'),
    meta: { menu: 'dealer' }
  }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
