const Redis = require("ioredis");
const env = require("./env");

let redis;

async function connectRedis() {
  redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  await redis.ping();
  return redis;
}

function getRedis() {
  if (!redis) {
    redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  }
  return redis;
}

async function disconnectRedis() {
  if (redis) {
    await redis.quit();
  }
}

module.exports = { connectRedis, getRedis, disconnectRedis };
