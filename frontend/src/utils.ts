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

export const socket = io(import.meta.env.VITE_BACKEND_URL, { autoConnect: false })
export function connectToWsServer(sessionId: string) {
  return new Promise<void>((resolve) => {
    socket.auth = {
      token: sessionId
    }
    socket.connect()
    socket.on('connect', () => {
      resolve()
    })
  })
}

export function generatePlayerBracketText(isYou: Boolean) {
  return `(${isYou ? 'you' : 'them'})`
}

export function generatePlayerText(player: Player) {
  return `${player.nickname} <span class="font-bold">${generatePlayerBracketText(player.isYou)}</span>`
}
