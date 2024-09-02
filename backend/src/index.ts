import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  }),
);

const redis = new Redis(`${process.env.REDIS_URL}`);

app.get('/', async (req, res) => {
  redis.set('key', 'value');
  res.send(await redis.get('key'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
