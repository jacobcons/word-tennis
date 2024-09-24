import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
})
export function addBearerTokenToAxios(token: String) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

export let socket: Socket
export function connectToWsServer(sessionId: String) {
  socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: {
      token: sessionId
    }
  })
}

type GameData = {
  gameId: string
  playerAId: string
  playerANickname: string
  playerBId: string
  playerBNickname: string
  startingPlayerId: string
  startTimestamp: string
}
export const gameData = ref<GameData>({
  gameId: '',
  playerAId: '',
  playerANickname: '',
  playerBId: '',
  playerBNickname: '',
  startingPlayerId: '',
  startTimestamp: ''
})

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
