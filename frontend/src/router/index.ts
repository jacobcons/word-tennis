import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import SearchView from '@/views/SearchView.vue'
import GameView from '@/views/GameView.vue'

//createWebHistory(import.meta.env.BASE_URL)
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomeView
    },
    {
      path: '/search',
      component: SearchView
    },
    {
      path: '/game/:id',
      component: GameView
    }
  ]
})

export default router
