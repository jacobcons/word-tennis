type Player = {
  id: string
  nickname: string
  isYou: boolean
}

export type GameData = {
  gameId: string
  COUNTDOWN_TIME_S: number
  TURN_TIME_S: number
  players: Player[]
}