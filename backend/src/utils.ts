import pino from 'pino';
import Redis from 'ioredis';
import { addSeconds } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { io } from '@/index.js';
import { COUNTDOWN_TIME_S, TURN_TIME_S } from '@/constants.js';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ZodType } from 'zod';

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

export const redis = new Redis(`${process.env.REDIS_URL}`);

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pairPlayersInQueue() {
  while (true) {
    const playersInQueue = await redis.zcount('queue', -Infinity, Infinity);
    const playersToPair =
      playersInQueue % 2 == 1 ? playersInQueue - 1 : playersInQueue;
    if (playersToPair >= 2) {
      const elements = await redis.zpopmin('queue', playersToPair);
      for (let i = 0; i <= elements.length - 4; i += 2) {
        // pair 2 player ids from queue
        const playerAId = elements[i];
        const playerBId = elements[i + 2];

        // fetch nicknames
        const [playerANickname, playerBNickname] = await Promise.all([
          redis.hget(`player:${playerAId}`, 'nickname'),
          redis.hget(`player:${playerBId}`, 'nickname'),
        ]);

        // setup array of 2 paired players, pick random starting player (first element is starter)
        // send down which player is actually them to each player
        type Player = {
          id: string;
          nickname: string;
        };
        const playerA: Player = { id: playerAId, nickname: playerANickname };
        const playerB: Player = { id: playerBId, nickname: playerBNickname };
        let startingPlayerId;
        let playersForPlayerA: Player[];
        let playersForPlayerB: Player[];
        if (Math.random() < 0.5) {
          startingPlayerId = playerAId;
          playersForPlayerA = [
            { ...playerA, isYou: true },
            { ...playerB, isYou: false },
          ];
          playersForPlayerB = [
            { ...playerA, isYou: false },
            { ...playerB, isYou: true },
          ];
        } else {
          startingPlayerId = playerBId;
          playersForPlayerA = [
            { ...playerB, isYou: false },
            { ...playerA, isYou: true },
          ];
          playersForPlayerB = [
            { ...playerB, isYou: true },
            { ...playerA, isYou: false },
          ];
        }

        // store game data in redis
        const gameDataForRedis = {
          playerAId,
          playerBId,
          startingPlayerId,
          startTimestamp: addSeconds(new Date(), 3).toISOString(),
        };
        const gameId = uuidv4();
        await redis.hset(`game:${gameId}`, gameDataForRedis);

        // emit game data to matched players
        const gameDataForPlayers = {
          gameId,
          COUNTDOWN_TIME_S,
          TURN_TIME_S,
        };
        io.to(playerAId).emit('matched', {
          ...gameDataForPlayers,
          players: playersForPlayerA,
        });
        io.to(playerBId).emit('matched', {
          ...gameDataForPlayers,
          players: playersForPlayerB,
        });
      }
    } else {
      await delay(50);
    }
  }
}

export async function chatCompletion(content: string, responseFormat: ZodType) {
  const openai = new OpenAI();

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a bot that judges a game where users type words back and forth between each other. The current word must be related to the previous one.',
      },
      {
        role: 'user',
        content,
      },
    ],
    response_format: zodResponseFormat(responseFormat, 'question'),
  });

  return completion.choices[0].message.parsed;
}
