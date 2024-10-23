export type Player = {
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

export enum EndReason {
  InvalidWord = 'INVALID_WORD',
  UnrelatedWord = 'UNRELATED_WORD',
  SameSimilarWord = 'SAME_SIMILAR_WORD',
  TookTooLong = 'TOOK_TOO_LONG'
}

export type GameResults = {
  winner: Player
  players: Player[]
  turns: {
    playerId: string
    word: string
    submitUnixTime: string
  }[]
  endReason: EndReason
}
