import axios from 'axios'
import { io, Socket } from 'socket.io-client'

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
})
export function addBearerTokenToAxios(token: String) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

export let socket: Socket
export function connectToWsServer(sessionId: String) {
  if (!socket) {
    socket = io(import.meta.env.VITE_BACKEND_URL, {
      auth: {
        token: sessionId
      }
    })
  }
}
