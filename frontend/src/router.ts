import { createRouter, createWebHistory } from 'vue-router'
import Journey from './pages/Journey.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/learn/1' },
    { path: '/learn/:step?', name: 'journey', component: Journey, meta: { fullscreen: true } },
    { path: '/sandbox', name: 'sandbox', component: () => import('./pages/Sandbox.vue') },
    { path: '/rigging', name: 'rigging', component: () => import('./pages/Rigging.vue') },
    { path: '/lab', name: 'lab', component: () => import('./pages/Lab.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/learn/1' },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})
