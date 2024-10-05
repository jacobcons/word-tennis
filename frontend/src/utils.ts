import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'

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

type GameData = {
  gameId: string
  playerAId: string
  playerANickname: string
  playerBId: string
  playerBNickname: string
  startingPlayerId: string
  startTimestamp: string
  COUNTDOWN_TIME_S: number
  TURN_TIME_S: number
}

export const gameData: { value: GameData } = {
  value: {
    gameId: '',
    playerAId: '',
    playerANickname: '',
    playerBId: '',
    playerBNickname: '',
    startingPlayerId: '',
    startTimestamp: '',
    COUNTDOWN_TIME_S: NaN,
    TURN_TIME_S: NaN
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
