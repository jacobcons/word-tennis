import { chatCompletion, redis } from '@/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { Game, Turn } from '@/types.js';
import { differenceInSeconds } from 'date-fns';
import { TURN_TIME_S } from '@/constants.js';
import { z } from 'zod';

export async function createOrUpdatePlayer(req, res) {
  let nickname = req.body?.nickname;
  if (!nickname) {
    return res.status(400).json({ error: 'Please provide a nickname' });
  }
  nickname = nickname.trim();
  const MAX_NICKNAME_LENGTH = 40;
  if (nickname === '' || nickname.length > MAX_NICKNAME_LENGTH) {
    return res.status(400).json({
      error: `Please provide a nickname that is ${MAX_NICKNAME_LENGTH} characters or less`,
    });
  }

  const sessionId = req.body?.currentSessionId;
  const playerId = await redis.get(`sessionId:${sessionId}`);
  // session invalid => gen player, session, set nickname
  if (!playerId) {
    const playerId = uuidv4();
    const newSessionId = uuidv4();
    await Promise.all([
      redis.hset(`player:${playerId}`, { nickname }),
      redis.set(`sessionId:${newSessionId}`, playerId),
    ]);
    return res.json({ newSessionId });
  }

  // session valid => update nickname of existing player
  await redis.hset(`player:${playerId}`, { nickname });
  res.end();
}

export async function joinQueue(req, res) {
  await redis.zadd('queue', [+new Date(), req.player.id]);
  res.end();
}

export async function leaveQueue(req, res) {
  await redis.zrem('queue', req.player.id);
  res.end();
}

export async function haveTurn(req, res) {
  const { gameId, word } = req.body;
  const playerId = req.player.id;
  const gameData = (await redis.hgetall(`game:${gameId}`)) as Game;

  if (!gameData) {
    return res.status(404).json({ message: `no game with given id found` });
  }

  const gameTurnsKey = `game:${gameId}:turns`;
  const turns = (await redis.lrange(gameTurnsKey, 0, -1)) as Turn[];
  if (!turns) {
    if (gameData.startingPlayerId !== playerId) {
      return res
        .status(409)
        .json({ message: 'first word must be submitted by starting player' });
    }

    if (
      differenceInSeconds(new Date(), new Date(gameData.startTimestamp)) >
      TURN_TIME_S
    ) {
      return res.status(409).json({
        message: `first word must be submitted within ${TURN_TIME_S} seconds of the game starting`,
      });
    }

    const turnId = uuidv4();
    const turnKey = `turn:${turnId}`;
    await redis.hset(turnKey, { playerId, word });
    await redis.lpush(gameTurnsKey, turnKey);

    const isValidWord = await chatCompletion(
      `${word} is the first word. Is it a valid word? Give your answer as a boolean`,
      z.boolean(),
    );
    if (!isValidWord) {
      return res
        .status(400)
        .json({ message: 'submitted word must be a real word' });
    }

    await redis.hset(turnKey, { submitTimestamp: new Date().toISOString() });
    return res.json({ message: 'word has been added' });
  }
}
