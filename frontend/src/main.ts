import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { addBearerTokenToAxios, connectToWsServer, socket } from '@/utils.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

const sessionId = localStorage.getItem('sessionId')
if (sessionId) {
  addBearerTokenToAxios(sessionId)
  connectToWsServer(sessionId)
}
