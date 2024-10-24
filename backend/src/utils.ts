import { pino } from 'pino';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { io } from '@/index.js';
import { EndReason, Game, HttpError, Turn } from '@/types/types.js';
import { v4 as uuidv4 } from 'uuid';
import { TURN_TIME_S } from '@/constants.js';

export const logger = pino({
  level: process.env.NODE_ENV === 'dev' ? 'trace' : 'info',
  transport:
    process.env.NODE_ENV === 'dev'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

// @ts-expect-error
export const redis = new Redis(`${process.env.REDIS_URL}`);

const openai = new OpenAI();
export async function chatCompletion(content: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0,
  });

  return completion.choices[0].message.content as string;
}

export function generateIsValidWordPrompt(word) {
  return `You are given the word ${word}. You must output y if its spelt correctly, the corrected word if a spell checker would correct it (e.g. rasberry->raspberry), or n if it's spelt incorrectly. The output must not exceed a single word.`;
}

export function ensureWordFromCurrentPlayer(
  currentPlayerId: string,
  playerId: string,
) {
  if (currentPlayerId !== playerId) {
    throw new HttpError(409, 'word must be submitted by current player');
  }
}

export function ensureWordSubmittedDuringTurn(lastTurnUnixTime: number) {
  const timeSinceLastTurnS = (Date.now() - lastTurnUnixTime) / 1000;
  if (
    isNaN(timeSinceLastTurnS) ||
    timeSinceLastTurnS > TURN_TIME_S ||
    timeSinceLastTurnS < 0
  ) {
    throw new HttpError(409, 'word must be submitted during your turn');
  }
}

export async function ensureWordIsValid(
  isValidWordResponse: string,
  playerAId: string,
  playerBId: string,
  gameId: string,
) {
  const isNotValidWord = isValidWordResponse === 'n';
  if (isNotValidWord) {
    await setEndReason(gameId, EndReason.InvalidWord);
    emitEndGame(playerAId, playerBId);
    throw new HttpError(400, 'word must be a real word');
  }
}

export function emitProcessingWord(playerAId: string, playerBId: string) {
  io.to(playerAId).to(playerBId).emit('processing-word');
}

export function emitEndGame(playerAId: string, playerBId: string) {
  io.to(playerAId).to(playerBId).emit('end-game');
}

export function emitValidWord(
  playerAId: string,
  playerBId: string,
  word: string,
) {
  io.to(playerAId).to(playerBId).emit('valid-word', word);
}

export function getFinalWord(isValidWordResponse: string, word: string) {
  return isValidWordResponse === 'y' ? word : isValidWordResponse;
}

export function setTurnTimer(
  turnTimers: Map<string, number>,
  gameId: string,
  timeS: number,
  playerAId: string,
  playerBId: string,
) {
  turnTimers.set(
    gameId,
    setTimeout(async () => {
      await setEndReason(gameId, EndReason.TookTooLong);
      emitEndGame(playerAId, playerBId);
    }, timeS * 1000),
  );
}

export function clearTurnTimer(
  turnTimers: Map<string, number>,
  gameId: string,
) {
  const timerIntervalId = turnTimers.get(gameId);
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
  }
}

export async function getGameData(gameId: string): Promise<Game> {
  const gameData = (await redis.hgetall(`game:${gameId}`)) as Game;
  if (gameData.startUnixTime) {
    gameData.startUnixTime = Number(gameData.startUnixTime);
  }
  return gameData;
}

export function getTurnIds(gameId: string): Promise<string[]> {
  return redis.lrange(getGameTurnsKey(gameId), 0, -1) as Promise<string[]>;
}

function getGameTurnsKey(gameId: string): string {
  return `game:${gameId}:turns`;
}

export function getTurns(turnIds: string[]): Promise<Turn[]> {
  return Promise.all(turnIds.map((id) => redis.hgetall(id) as Promise<Turn>));
}

export function getNicknames(
  playerAId: string,
  playerBId: string,
): Promise<string>[] {
  return [
    redis.hget(`player:${playerAId}`, 'nickname'),
    redis.hget(`player:${playerBId}`, 'nickname'),
  ];
}

export async function saveTurn(turn: Partial<Turn>, gameId: string) {
  const turnKey = `turn:${uuidv4()}`;
  await Promise.all([
    redis.hset(turnKey, turn),
    redis.rpush(getGameTurnsKey(gameId), turnKey),
  ]);
  return turnKey;
}

export async function updateTurn(turn: Partial<Turn>, turnKey: string) {
  await redis.hset(turnKey, turn);
}

export function setEndReason(gameId: string, endReason: EndReason) {
  return redis.hset(`game:${gameId}`, { endReason });
}

export function ensureGameExists(gameData: Game) {
  if (!Object.keys(gameData).length) {
    throw new HttpError(404, 'no game with given id found');
  }
}
