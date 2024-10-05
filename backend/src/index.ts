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
import { createOrUpdatePlayer } from '@/handlers.js'

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
app.put('/players', createOrUpdatePlayer);

app.post('/join-queue', verifySession, async (req, res) => {
  await redis.zadd('queue', [+new Date(), req.player.id]);
  res.end();
});

app.post('/leave-queue', verifySession, async (req, res) => {
  await redis.zrem('queue', req.player.id);
  res.end();
});

app.get('/games/:id', verifySession, async (req, res) => {
  type GameData = {
    playerAId: string;
    playerANickname: string;
    playerBId: string;
    playerBNickname: string;
    startingPlayerId: string;
    startTimestamp: string;
  };
  const gameData = (await redis.hgetall(`game:${req.params.id}`)) as GameData;
  if (!gameData) {
    res.status(404).json({ message: `no game with id ${req.params.id} found` });
  }
  //gameData.startTimestamp = addSeconds(new Date(), 3).toISOString();
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
          COUNTDOWN_TIME_S: 3,
          TURN_TIME_S: 5,
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
})();

// start the HTTP server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
