import express, { NextFunction, ErrorRequestHandler } from 'express';
import 'express-async-errors';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import {
  logRequestResponse,
  verifySession,
  verifySessionWs,
} from '@/middlewares.js';
import { logger, redis } from '@/utils.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
io.on('connection', (socket) => {
  socket.emit('test');
});

// middlewares
app.use(cors(corsConfig));
app.use(express.json());
app.use(logRequestResponse);

// routes
app.post('/players', async (req, res) => {
  const playerId = uuidv4();

  const requestNickname = req.body?.nickname;
  const isNoNickname =
    requestNickname === undefined || requestNickname.trim() === '';
  const nickname = isNoNickname
    ? uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] })
    : requestNickname;

  const sessionId = uuidv4();

  await Promise.all([
    redis.hset(`player:${playerId}`, { nickname }),
    redis.set(`sessionId:${sessionId}`, playerId),
  ]);

  res.json({ sessionId, nickname });
});

app.post('/queue', verifySession, async (req, res) => {
  const userId = req.user.id;
  await redis.zadd('queue', [+new Date(), userId]);
});

const errorHandler: ErrorRequestHandler = (err, req, res) => {
  logger.error(err);
  res.status(500).json({ error: 'something went wrong!' });
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
