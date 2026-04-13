const mongoose = require("mongoose");
const env = require("./env");
const { logger } = require("./logger");

async function connectDatabase() {
  await mongoose.connect(env.mongoUri);
  logger.info("MongoDB connected");
}

async function disconnectDatabase() {
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
