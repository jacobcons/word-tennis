export type Game = {
  playerAId: string;
  playerBId: string;
  startingPlayerId: string;
  startTimestamp: string;
};

export type Turn = {
  playerId: string;
  word: string;
  submitTimestamp: string;
};
