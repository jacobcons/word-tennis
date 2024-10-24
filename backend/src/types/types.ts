export type Game = {
  playerAId: string;
  playerBId: string;
  startingPlayerId: string;
  startUnixTime: number;
  endReason: EndReason;
};

export type Turn = {
  playerId: string;
  word: string;
  submitUnixTime: number;
};

export type Player = {
  id: string;
  nickname: string;
  isYou?: boolean;
};

export enum EndReason {
  InvalidWord = 'INVALID_WORD',
  UnrelatedWord = 'UNRELATED_WORD',
  SameSimilarWord = 'SAME_SIMILAR_WORD',
  TookTooLong = 'TOOK_TOO_LONG',
}

export class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
