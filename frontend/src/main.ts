import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { addBearerTokenToAxios, connectToWsServer, socket } from '@/utils.js'
import VueGtag from 'vue-gtag'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(
  VueGtag,
  {
    config: {
      id: 'G-BWPVEB55J5'
    }
  },
  router
)

app.mount('#app')

const sessionId = localStorage.getItem('sessionId')
if (sessionId) {
  addBearerTokenToAxios(sessionId)
  connectToWsServer(sessionId)
}
