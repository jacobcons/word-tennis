import { redis } from '@/utils.js'
import { v4 as uuidv4 } from 'uuid'

export async function createOrUpdatePlayer(req, res) {
  let nickname = req.body?.nickname;
  if (!nickname) {
    res.status(400).json({ error: 'Please provide a nickname' });
  }
  nickname = nickname.trim();
  const maxNicknameLength = 30;
  if (nickname === '' || nickname.length > maxNicknameLength) {
    res.status(400).json({
      error: `Please provide a nickname that is ${maxNicknameLength} characters or less`,
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

export async function getGame(req, res) {
  const gameData = (await redis.hgetall(`game:${req.params.id}`)) as GameData;
  if (!gameData) {
    res.status(404).json({ message: `no game with id ${req.params.id} found` });
  }
  //gameData.startTimestamp = addSeconds(new Date(), 3).toISOString();
  res.json(gameData);
}