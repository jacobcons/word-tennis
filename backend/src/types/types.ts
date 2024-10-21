export type Game = {
  playerAId: string;
  playerBId: string;
  startingPlayerId: string;
  startUnixTime: number;
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

export class HttpError extends Error {
  public status: number;

  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
