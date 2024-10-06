import express, {ErrorRequestHandler} from 'express';
import 'express-async-errors';
import cors from 'cors';
import {v4 as uuidv4} from 'uuid';
import {errorHandler, logRequestResponse, verifySession, verifySessionWs,} from '@/middlewares.js';
import {delay, logger, pairPlayersInQueue, redis} from '@/utils.js';
import {createServer} from 'http';
import {Server} from 'socket.io';
import {addSeconds} from 'date-fns';
import {createOrUpdatePlayer, getGame, joinQueue, leaveQueue} from '@/handlers.js'

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
app.get('/games/:id', verifySession, getGame);

// error handler
app.use(errorHandler);

// pair players in queue system
(async () => {
  await pairPlayersInQueue()
})();

// start the HTTP server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
