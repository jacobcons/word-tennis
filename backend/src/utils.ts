import { pino } from 'pino';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { io } from '@/index.js';
import { HttpError, Turn } from '@/types/types.js';
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
  return true;
  const timeSinceLastTurnS = (Date.now() - lastTurnUnixTime) / 1000;
  if (timeSinceLastTurnS > TURN_TIME_S || timeSinceLastTurnS < 0) {
    throw new HttpError(409, 'word must be submitted during your turn');
  }
}

export function emitProcessingWord(playerAId: string, playerBId: string) {
  io.to(playerAId).to(playerBId).emit('processing-word');
}

export function ensureWordIsValid(
  isValidWordResponse: string,
  playerAId: string,
  playerBId: string,
) {
  const isNotValidWord = isValidWordResponse === 'n';
  if (isNotValidWord) {
    emitEndGame(playerAId, playerBId);
    throw new HttpError(400, 'word must be a real word');
  }
}

export function emitEndGame(playerAId: string, playerBId: string) {
  io.to(playerAId).to(playerBId).emit('end-game');
}

export function getFinalWord(isValidWordResponse: string, word: string) {
  return isValidWordResponse === 'y' ? word : isValidWordResponse;
}

export async function saveTurn(turn: Turn, gameTurnsKey: string) {
  const turnKey = `turn:${uuidv4()}`;
  await Promise.all([
    redis.hset(turnKey, turn),
    redis.lpush(gameTurnsKey, turnKey),
  ]);
}

export function emitValidWord(
  playerAId: string,
  playerBId: string,
  word: string,
) {
  io.to(playerAId).to(playerBId).emit('valid-word', word);
}
