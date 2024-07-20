import Redis from 'ioredis';

const redisClient = new Redis({
  host: '46.8.220.103',
  port: 6379,
});

const CACHE_TTL = 3600;

export const setCache = async (key, value) => {
  try {
    return redisClient.set(key, JSON.stringify(value), 'EX', CACHE_TTL)
  } catch (err) {
    console.error('Error Redis:', err.response ? err.response.data : err.message);
  }
};

export const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error Redis:', err.response ? err.response.data : err.message);
  }
};


