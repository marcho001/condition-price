import { createRouter, createWebHashHistory } from 'vue-router'
import { db } from '@/shared/store.js'
import { dealerById } from '@/shared/engine.js'

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
  { path: '/forgot', name: 'forgot', component: () => import('./views/ForgotView.vue'), meta: { public: true } },
  { path: '/', name: 'list', component: () => import('./views/AuctionListView.vue') },
  { path: '/auction/:roundId', name: 'detail', component: () => import('./views/AuctionDetailView.vue') },
  { path: '/mybids', name: 'mybids', component: () => import('./views/MyBidsView.vue') },
  { path: '/won', name: 'won', component: () => import('./views/WonView.vue') },
  { path: '/notices', name: 'notices', component: () => import('./views/NoticesView.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

// 未ログインは車両情報を一切表示せず、ログイン画面へ
router.beforeEach((to) => {
  const dealer = db.dealerSession ? dealerById(db.dealerSession) : null
  const ok = dealer && dealer.status === 'ACTIVE'
  if (!ok && !to.meta.public) return { name: 'login' }
  if (ok && to.meta.public) return { name: 'list' }
  return true
})

export default router
