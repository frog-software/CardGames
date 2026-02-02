import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Vant from 'vant'
import 'vant/lib/index.css'

import App from './App.vue'
import Home from './views/Home.vue'
import Lobby from './views/Lobby.vue'
import Room from './views/Room.vue'
import Game from './views/Game.vue'

// Create router
const routes = [
  { path: '/', component: Home },
  { path: '/lobby', component: Lobby },
  { path: '/room/:id', component: Room },
  { path: '/game/:id', component: Game }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create app
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Vant)
app.mount('#app')
