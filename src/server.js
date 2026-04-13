const { createServer } = require("http");
const app = require("./app");
const { connectDatabase, disconnectDatabase } = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis");
const { logger } = require("./config/logger");
const { initQueues, closeQueues } = require("./jobs");
const env = require("./config/env");
const { ensureDefaultPlans } = require("./services/planService");

let server;

async function bootstrap() {
  await connectDatabase();
  await connectRedis();
  await ensureDefaultPlans();
  await initQueues();

  server = createServer(app);
  server.listen(env.port, () => {
    logger.info("Server started", { port: env.port, env: env.nodeEnv });
  });
}

async function shutdown(signal) {
  logger.info("Shutdown initiated", { signal });
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeQueues();
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection", { message: error.message, stack: error.stack });
});

bootstrap().catch((error) => {
  logger.error("Bootstrap failed", { message: error.message, stack: error.stack });
  process.exit(1);
});
