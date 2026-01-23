import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'users/list',
        name: 'UserList',
        component: () => import('../views/users/List.vue')
      },
      {
        path: 'users/create',
        name: 'UserCreate',
        component: () => import('../views/users/Create.vue')
      },
      {
        path: 'questions/list',
        name: 'QuestionList',
        component: () => import('../views/questions/List.vue')
      },
      {
        path: 'questions/create',
        name: 'QuestionCreate',
        component: () => import('../views/questions/Create.vue')
      },
      {
        path: 'papers/list',
        name: 'PaperList',
        component: () => import('../views/papers/List.vue')
      },
      {
        path: 'papers/create',
        name: 'PaperCreate',
        component: () => import('../views/papers/Create.vue')
      },
      {
        path: 'exams/list',
        name: 'ExamList',
        component: () => import('../views/exams/List.vue')
      },
      {
        path: 'exams/create',
        name: 'ExamCreate',
        component: () => import('../views/exams/Create.vue')
      },
      {
        path: 'scores/list',
        name: 'ScoreList',
        component: () => import('../views/scores/List.vue')
      },
      {
        path: 'scores/analysis',
        name: 'ScoreAnalysis',
        component: () => import('../views/scores/Analysis.vue')
      },
      {
        path: 'media/list',
        name: 'MediaList',
        component: () => import('../views/media/List.vue')
      },
      {
        path: 'media/upload',
        name: 'MediaUpload',
        component: () => import('../views/media/Upload.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫

router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const requiresAuth = to.matched.some((record: RouteRecordRaw) => record.meta?.requiresAuth !== false)
  
  if (requiresAuth) {
    const userStore = useUserStore()
    const isLoggedIn = await userStore.checkLogin()
    
    if (!isLoggedIn) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
