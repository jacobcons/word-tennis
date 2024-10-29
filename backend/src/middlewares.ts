import { logger, redis } from '@/utils.js';
import { ErrorRequestHandler, NextFunction } from 'express';
import { HttpError } from '@/types.js';
import { Socket } from 'socket.io';

export function logRequestResponse(req, res, next) {
  const startTime = new Date().getTime();
  logger.debug(
    {
      body: req.body,
    },
    `Request ${req.method} ${req.url}`,
  );

  // Hook into res.json to capture the body
  const originalJson = res.json;
  let responseBody;
  res.json = (body) => {
    responseBody = body;
    return originalJson.call(res, body);
  };

  // Listen for when the response is finished
  res.on('finish', () => {
    const responseTime = new Date().getTime() - startTime;

    const objToLog = {
      body: undefined,
    };
    if (responseBody) {
      objToLog.body = responseBody;
    }
    logger.debug(
      objToLog,
      `Response ${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`,
    );
  });
  next();
}

export async function verifySession(req, res, next) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No session ID provided' });
  }

  const sessionId = authHeader.split(' ')[1];
  const playerId = await redis.get(`sessionId:${sessionId}`);
  if (!playerId) {
    return res.status(401).json({ message: 'Invalid session ID' });
  }
  res.locals.player = { id: playerId };
  next();
}

export async function verifySessionWs(socket, next) {
  const sessionId = socket.handshake.auth.token;
  const playerId = await redis.get(`sessionId:${sessionId}`);
  if (!playerId) {
    return next(Error('Invalid Session Id'));
  }
  socket.join(playerId);
  next();
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  logger.error(err, err.message);
  return res.status(500).json({ message: 'something went wrong!' });
};
