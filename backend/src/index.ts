import express, { NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import { logRequestResponse, verifySession } from '@/middlewares.js';

import { logger, redis } from '@/utils.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  }),
);
app.use(express.json());
app.use(logRequestResponse);

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

app.post('/add-to-queue', verifySession, async (req, res) => {
  await redis.zadd('queue', [+new Date(), req.user.id]);
  res.end();
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  return res.status(500).json({ error: 'something went wrong!' });
});

function delay(ms: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

(async () => {
  while (true) {
    const playersInQueue = await redis.zcount('queue', -Infinity, Infinity);
    if (playersInQueue >= 2) {
      const [playerA, , playerB] = await redis.zpopmin('queue', 2);
      console.log(`${playerA} and ${playerB} have been matched!`);
    }
    await delay(50);
  }
})();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
