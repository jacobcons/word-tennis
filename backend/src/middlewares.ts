import { logger, redis } from '@/utils.js';

export function logRequestResponse(req, res, next) {
  const startTime = new Date().getTime();
  logger.debug(
    {
      body: req.body,
    },
    `Request ${req.method} ${req.url}`,
  );

  const json = res.json;
  res.json = (body) => {
    const responseTime = new Date().getTime() - startTime;
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

export async function verifySession(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No session ID provided' });
  }

  const sessionId = authHeader.split(' ')[1];
  const userId = await redis.get(`sessionId:${sessionId}`);
  if (!userId) {
    return res.status(401).json({ message: 'Invalid session ID' });
  }
  req.user = { id: userId };
  next();
}

export async function verifySessionWs(socket, next) {
  const sessionId = socket.handshake.auth.token;
  const userId = await redis.get(`sessionId:${sessionId}`);
  if (!userId) {
    return next(Error('Invalid Session Id'));
  }
  socket.user = { id: userId };
  next();
}
