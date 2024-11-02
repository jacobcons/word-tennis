import Redis from 'ioredis';

const redis = new Redis(``) as Redis;
async function fetchAndPrintAllData() {
  try {
    const keys = (await redis.keys('*')) as string[]; // Get all keys
    let gameKeys = keys.filter(
      (key) => key.startsWith('game') && !key.endsWith('turns'),
    );
    console.log('Keys in Redis:', keys);
    console.log(await redis.zrange('queue', 0, -1));
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    redis.disconnect(); // Close the connection when done
  }
}

// Call the function to fetch and output data
await fetchAndPrintAllData();
