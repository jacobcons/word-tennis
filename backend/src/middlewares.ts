import pino from 'pino';
import { redis } from '@/redis.js';

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

export function logRequestResponse(req, res, next) {
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
}

export function verifySession() {
  return async (req, res, next) => {
    const sessionId = req.body.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: 'No sessionId provided' });
    }

    const userId = parseInt(
      (await redis.get(`sessionId:${sessionId}`)) as string,
      10,
    );
    if (!userId) {
      return res.status(401).json({ message: 'Invalid sessionId' });
    }
    req.user = { id: userId };
    next();
  };
}
