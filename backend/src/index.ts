import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import pino from 'pino';
const logger = pino({
  level: process.env.NODE_ENV === 'dev' ? 'trace' : 'info',
  transport:
    process.env.NODE_ENV === 'dev'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  }),
);
app.use(express.json());
app.use((req, res, next) => {
  const startTime = new Date();
  logger.debug(
    {
      body: req.body,
    },
    `Request ${req.method} ${req.url}`,
  );

  const json = res.json;
  res.json = (body) => {
    const responseTime = new Date() - startTime;
    logger.debug(
      {
        body,
      },
      `Response ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`,
    );
    res.json = json;
    return res.json(body);
  };
  next();
});

const redis = new Redis(`${process.env.REDIS_URL}`);

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
