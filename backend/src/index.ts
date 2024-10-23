import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import {
  errorHandler,
  logRequestResponse,
  verifySession,
  verifySessionWs,
} from '@/middlewares.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  createOrUpdatePlayer,
  getGameResults,
  haveTurn,
  joinQueue,
  leaveQueue,
} from '@/handlers.js';

// setup servers
const app = express();
const server = createServer(app);
const corsConfig = {
  origin: process.env.FRONTEND_URL,
};

// socket.io
export const io = new Server(server, {
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
app.post('/join-queue', verifySession, joinQueue);
app.post('/leave-queue', verifySession, leaveQueue);
app.post('/turns', verifySession, haveTurn);
app.get('/games/:id/results', verifySession, getGameResults);

// error handler
app.use(errorHandler);

// start the HTTP server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`app listening on port ${PORT}`);
});
