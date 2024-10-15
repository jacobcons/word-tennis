import { chatCompletion, redis } from '@/utils.js';
import { v4 as uuidv4 } from 'uuid';
import { Game, Turn } from '@/types.js';
import { addSeconds, differenceInSeconds } from 'date-fns';
import { COUNTDOWN_TIME_S, TURN_TIME_S } from '@/constants.js';
import { io } from '@/index.js';

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

  const playersInQueue = await redis.zcount('queue', -Infinity, Infinity);
  if (playersInQueue >= 2) {
    const [playerAId, , playerBId] = await redis.zpopmin('queue', 2);

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
      isYou?: boolean;
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
  const { playerAId, playerBId } = gameData;

  if (!Object.keys(gameData).length) {
    return res.status(404).json({ message: `no game with given id found` });
  }

  const gameTurnsKey = `game:${gameId}:turns`;
  const turns = (await redis.lrange(gameTurnsKey, 0, -1)) as Turn[];
  if (1 || !turns.length) {
    if (gameData.startingPlayerId !== playerId) {
      return res
        .status(409)
        .json({ message: 'first word must be submitted by starting player' });
    }

    // if (
    //   differenceInSeconds(new Date(), new Date(gameData.startTimestamp)) >
    //   TURN_TIME_S
    // ) {
    //   return res.status(409).json({
    //     message: `first word must be submitted within ${TURN_TIME_S} seconds of the game starting`,
    //   });
    // }

    io.to(playerAId).to(playerBId).emit('processing-word');
    const isValidWordResponse = await chatCompletion(
      `You are given the word ${word}. You must output y if its spelt correctly, the corrected word if a spell checker would correct it (e.g. rasberry->raspberry), or n if it's spelt incorrectly. The output must not exceed a single word.`,
    );

    const isNotValidWord = isValidWordResponse === 'n';
    if (isNotValidWord) {
      // todo: emit to users endgame
      return res
        .status(400)
        .json({ message: 'submitted word must be a real word' });
    }

    // if valid word => keep word the same, otherwise use corrected word
    const finalWord = isValidWordResponse === 'y' ? word : isValidWordResponse;

    // push turn to list of turns in db
    const turnId = uuidv4();
    const turnKey = `turn:${turnId}`;
    await Promise.all([
      redis.hset(turnKey, {
        playerId,
        word: finalWord,
        submitTimestamp: new Date().toISOString(),
      }),
      redis.lpush(gameTurnsKey, turnKey),
    ]);
    io.to([playerAId, playerBId]).emit('valid-word', finalWord);

    return res.json({ message: `${finalWord} has been added to turn` });
  }

  res.end();
}
