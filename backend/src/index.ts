import express, { NextFunction, ErrorRequestHandler } from 'express';
import 'express-async-errors';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestResponse,
  verifySession,
  verifySessionWs,
} from '@/middlewares.js';
import { logger, redis } from '@/utils.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { addSeconds } from 'date-fns';

const app = express();
const server = createServer(app);
const corsConfig = {
  origin: process.env.FRONTEND_URL,
};

// socket.io
const io = new Server(server, {
  cors: corsConfig,
});
io.use(verifySessionWs);
io.on('connection', (socket) => {});

// middlewares
app.use(cors(corsConfig));
app.use(express.json());
app.use(logRequestResponse);

// routes
app.put('/players', async (req, res) => {
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
});

app.post('/join-queue', verifySession, async (req, res) => {
  await redis.zadd('queue', [+new Date(), req.player.id]);
  res.end();
});

app.post('/leave-queue', verifySession, async (req, res) => {
  await redis.zrem('queue', req.player.id);
  res.end();
});

type GameData = {
  playerAId: string;
  playerANickname: string;
  playerBId: string;
  playerBNickname: string;
  startingPlayerId: string;
  startTimestamp: string;
};
app.get('/games/:id', verifySession, async (req, res) => {
  const gameData = (await redis.hgetall(`game:${req.params.id}`)) as GameData;
  if (!gameData) {
    res.status(404).json({ message: `no game with id ${req.params.id} found` });
  }
  gameData.startTimestamp = addSeconds(new Date(), 3).toISOString();
  res.json(gameData);
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ message: 'something went wrong!' });
};
app.use(errorHandler);

// queue system that pairs players
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  while (true) {
    const playersInQueue = await redis.zcount('queue', -Infinity, Infinity);
    const playersToPair =
      playersInQueue % 2 == 1 ? playersInQueue - 1 : playersInQueue;
    if (playersToPair >= 2) {
      const elements = await redis.zpopmin('queue', playersToPair);
      for (let i = 0; i <= elements.length - 4; i += 2) {
        const playerAId = elements[i];
        const playerBId = elements[i + 2];

        const gameId = uuidv4();
        const startingPlayerId = Math.random() < 0.5 ? playerAId : playerBId;
        const [playerANickname, playerBNickname] = await Promise.all([
          redis.hget(`player:${playerAId}`, 'nickname'),
          redis.hget(`player:${playerBId}`, 'nickname'),
        ]);
        await redis.hset(`game:${gameId}`, {
          playerAId,
          playerANickname,
          playerBId,
          playerBNickname,
          startingPlayerId,
          startTimestamp: addSeconds(new Date(), 3).toISOString(),
        });
        io.to(playerAId).to(playerBId).emit('matched', gameId);
      }
    } else {
      await delay(50);
    }
  }
})();

// start the HTTP server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
