import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'
import type { Player } from '@/types.js'

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
})
export function addBearerTokenToAxios(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

export let socket: Socket
export function connectToWsServer(sessionId: string) {
  socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: {
      token: sessionId
    }
  })
}

export function generatePlayerBracketText(isYou: Boolean) {
  return `(${isYou ? 'you' : 'them'})`
}

export function generatePlayerText(player: Player) {
  return `${player.nickname} <span class="font-bold">${generatePlayerBracketText(player.isYou)}</span>`
}
