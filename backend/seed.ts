import { addSeconds } from 'date-fns';
import { redis } from '@/utils.js';

await redis.hset(`game:55a0d9a4-e13f-4501-a474-5fe9ace5a820`, {
  startTimestamp: addSeconds(new Date(), 3).toISOString(),
});

await redis.del('game:55a0d9a4-e13f-4501-a474-5fe9ace5a820:turns');

process.exit(1);
