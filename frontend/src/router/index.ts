import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'AllComments' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallbackView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/pages',
    name: 'Pages',
    component: () => import('@/views/PagesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/comments',
    name: 'AllComments',
    component: () => import('@/views/AllCommentsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/pages/:pageId/posts',
    name: 'Posts',
    component: () => import('@/views/PostsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/posts/:postId/comments',
    name: 'Comments',
    component: () => import('@/views/CommentsView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth as boolean | undefined

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
    return
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'AllComments' })
    return
  }

  next()
})

export default router
