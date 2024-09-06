import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:3000'
})

const sessionId = localStorage.getItem('sessionId')
if (sessionId) {
  addBearerTokenToAxios(sessionId)
}

export function addBearerTokenToAxios(token: String) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}
