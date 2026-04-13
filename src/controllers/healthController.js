const mongoose = require("mongoose");
const { getRedis } = require("../config/redis");
const packageJson = require("../../package.json");

async function healthController(_req, res) {
  const redis = getRedis();
  const redisPing = await redis.ping();
  res.json({
    status: "ok",
    version: packageJson.version,
    mongodb: mongoose.connection.readyState,
    redis: redisPing
  });
}

module.exports = { healthController };
